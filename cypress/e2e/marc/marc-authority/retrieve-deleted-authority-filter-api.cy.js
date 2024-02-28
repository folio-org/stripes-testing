/* eslint-disable no-unused-vars */
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      searchOption: 'Keyword',
      tag010: '010',
      // tag100: '100',
      // localSourcePrefix: getRandomLetters(7),
      authorityHeadings: [
        'Apple & Honey Productions (with "nr" in the 010 field) C432317Auto',
        'Music C432317Auto',
        'Montessori method of education C432317Auto',
        'Hymnals C432317Auto',
        'Children (for test) C432317Auto',
        'Music (for test) C432317Auto',
        'Chemistry, Organic C432317Auto',
        'Comparative Study C432317Auto',
        'Postcards (with "lcgtm" in 010) C432317Auto',
        'Rare book (for test) C432317Auto',
        'Art (for test "aatg" in 010) C432317Auto',
        'GSAFD Genre (for test) C432317Auto',
        'Stone, Robert B (not from pre-defined list) C432317Auto',
        'Chin, Staceyann (with local auth file) 1972- C432317Auto',
      ],
      initialNaturalId: 'xabcx2008052404432317',
    };

    const marcFiles = [
      {
        marc: 'marcAuthFileC432317_1.mrc',
        fileName: `testMarcFileC432317.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 13,
        propertyName: 'relatedAuthorityInfo',
      },
      {
        marc: 'marcAuthFileC432317_2.mrc',
        fileName: `testMarcFileC43231.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 1,
        propertyName: 'relatedAuthorityInfo',
      },
    ];

    const createdRecordIDs = [];

    before('Creating user and data', () => {
      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.createAuthoritySourceFileViaAPI().then((source) => {
          testData.localSourceId = source.id;
          testData.localSourceCode = source.codes[0];

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.entries.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].idList[0]);
              });
            });
          });

          // update authority record with naturalId with code for created local source file
          cy.loginAsAdmin().then(() => {
            cy.visit(TopMenu.marcAuthorities);
            MarcAuthorities.waitLoading();
            MarcAuthoritiesSearch.searchBy(
              testData.searchOption,
              testData.authorityHeadings[createdRecordIDs.length - 1],
            );
            MarcAuthorities.selectTitle(testData.authorityHeadings[createdRecordIDs.length - 1]);
            MarcAuthority.edit();
            QuickMarcEditor.updateExistingField(
              testData.tag010,
              `$a ${testData.localSourceCode}432317`,
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });
    });

    after('Deleting created user and data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });
      // timeout to make sure back-end handled authority deletion before deleting source file
      cy.wait(2000);
      cy.deleteAuthoritySourceFileViaAPI(testData.localSourceId);
    });

    it(
      'C432317 Retrieve UUIDs of deleted MARC authority records using "Authority file" filter via API (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        MarcAuthoritiesSearch.searchBy(
          testData.searchOption,
          testData.authorityHeadings[createdRecordIDs.length - 1],
        );
        cy.wait(5000);
        // MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
        // MarcAuthoritiesDelete.clickDeleteButton();
        // MarcAuthoritiesDelete.checkDeleteModal();
        // MarcAuthoritiesDelete.confirmDelete();
        // MarcAuthoritiesDelete.verifyDeleteComplete(marcFiles[1].authorityHeading);

        // MarcAuthoritiesSearch.searchBy(testData.searchOption, marcFiles[2].authorityHeading);
        // MarcAuthorities.selectTitle(marcFiles[2].authorityHeading);
        // MarcAuthoritiesDelete.clickDeleteButton();
        // MarcAuthoritiesDelete.checkDeleteModal();
        // MarcAuthoritiesDelete.confirmDelete();
        // MarcAuthoritiesDelete.verifyDeleteComplete(marcFiles[2].authorityHeading);

        // MarcAuthority.getRecordsViaAPI().then((body) => {
        //   expect(
        //     body.authorities.filter(
        //       (record) => record.id === createdRecordIDs[1] || record.id === createdRecordIDs[2],
        //     ).length,
        //   ).to.equal(0);
        // });

        // MarcAuthority.getRecordsViaAPI(true).then((body) => {
        //   expect(
        //     body.authorities.filter((record) => record.id === createdRecordIDs[1]).length,
        //   ).to.equal(1);
        //   expect(
        //     body.authorities.filter((record) => record.id === createdRecordIDs[2]).length,
        //   ).to.equal(1);
        // });

        // MarcAuthority.getRecordsViaAPI(true, true).then((body) => {
        //   body.authorities
        //     .filter((rec, index) => index < 10)
        //     .forEach((record) => {
        //       expect(record).to.not.have.property('source');
        //       expect(record).to.not.have.property('identifiers');
        //       expect(record).to.not.have.property('sourceFileId');
        //       expect(record).to.not.have.property('naturalId');
        //       expect(record).to.not.have.property('metadata');
        //     });
        //   expect(
        //     body.authorities.filter((record) => record.id === createdRecordIDs[1]).length,
        //   ).to.equal(1);
        //   expect(
        //     body.authorities.filter((record) => record.id === createdRecordIDs[2]).length,
        //   ).to.equal(1);
        // });

        // MarcAuthority.getRecordsViaAPI(true, true, 'text/plain').then((body) => {
        //   const records = body.split('\n');
        //   expect(records.filter((record) => record === createdRecordIDs[1]).length).to.equal(1);
        //   expect(records.filter((record) => record === createdRecordIDs[2]).length).to.equal(1);
        // });
      },
    );
  });
});
