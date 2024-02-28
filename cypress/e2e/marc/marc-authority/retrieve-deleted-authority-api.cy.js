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
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      searchOption: 'Keyword',
      tag010: '010',
      tag100: '100',
    };

    const marcFiles = [
      {
        marc: 'marcBibFileC432300.mrc',
        fileName: `testMarcFileC432300.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 1,
        propertyName: 'relatedInstanceInfo',
      },
      {
        marc: 'marcAuthFileC432300_1.mrc',
        fileName: `testMarcFileC432300.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 1,
        propertyName: 'relatedAuthorityInfo',
        authorityHeading: 'Kerouac, Jack, C432300 1922-1969',
        tag010Value: '80036674432300',
      },
      {
        marc: 'marcAuthFileC432300_2.mrc',
        fileName: `testMarcFileC432300.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 1,
        propertyName: 'relatedAuthorityInfo',
        authorityHeading: 'Beatles C432300',
        tag010Value: 'n79018119432300',
      },
    ];

    const createdRecordIDs = [];

    before('Creating user and data', () => {
      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

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

        cy.loginAsAdmin().then(() => {
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(marcFiles[1].authorityHeading);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag010,
            `$a ${marcFiles[1].tag010Value}`,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Deleting created user and data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    });

    it(
      'C432300 Retrieve UUIDs of deleted MARC authority records via API (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        MarcAuthoritiesSearch.searchBy(testData.searchOption, marcFiles[1].authorityHeading);
        MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
        MarcAuthoritiesDelete.clickDeleteButton();
        MarcAuthoritiesDelete.checkDeleteModal();
        MarcAuthoritiesDelete.confirmDelete();
        MarcAuthoritiesDelete.verifyDeleteComplete(marcFiles[1].authorityHeading);

        MarcAuthoritiesSearch.searchBy(testData.searchOption, marcFiles[2].authorityHeading);
        MarcAuthorities.selectTitle(marcFiles[2].authorityHeading);
        MarcAuthoritiesDelete.clickDeleteButton();
        MarcAuthoritiesDelete.checkDeleteModal();
        MarcAuthoritiesDelete.confirmDelete();
        MarcAuthoritiesDelete.verifyDeleteComplete(marcFiles[2].authorityHeading);

        MarcAuthority.getRecordsViaAPI().then((body) => {
          expect(
            body.authorities.filter(
              (record) => record.id === createdRecordIDs[1] || record.id === createdRecordIDs[2],
            ).length,
          ).to.equal(0);
        });

        MarcAuthority.getRecordsViaAPI(true).then((body) => {
          expect(
            body.authorities.filter((record) => record.id === createdRecordIDs[1]).length,
          ).to.equal(1);
          expect(
            body.authorities.filter((record) => record.id === createdRecordIDs[2]).length,
          ).to.equal(1);
        });

        MarcAuthority.getRecordsViaAPI(true, true).then((body) => {
          body.authorities
            .filter((rec, index) => index < 10)
            .forEach((record) => {
              expect(record).to.not.have.property('source');
              expect(record).to.not.have.property('identifiers');
              expect(record).to.not.have.property('sourceFileId');
              expect(record).to.not.have.property('naturalId');
              expect(record).to.not.have.property('metadata');
            });
          expect(
            body.authorities.filter((record) => record.id === createdRecordIDs[1]).length,
          ).to.equal(1);
          expect(
            body.authorities.filter((record) => record.id === createdRecordIDs[2]).length,
          ).to.equal(1);
        });

        MarcAuthority.getRecordsViaAPI(true, true, 'text/plain').then((body) => {
          const records = body.split('\n');
          expect(records.filter((record) => record === createdRecordIDs[1]).length).to.equal(1);
          expect(records.filter((record) => record === createdRecordIDs[2]).length).to.equal(1);
        });
      },
    );
  });
});
