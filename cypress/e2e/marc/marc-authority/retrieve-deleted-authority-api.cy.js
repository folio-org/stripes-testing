import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

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
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileC432300_1.mrc',
        fileName: `testMarcFileC432300.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
        propertyName: 'authority',
        authorityHeading: 'C432300Kerouac, Jack, 1922-1969',
        tag010Value: '80036674432300',
      },
      {
        marc: 'marcAuthFileC432300_2.mrc',
        fileName: `testMarcFileC432300.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
        propertyName: 'authority',
        authorityHeading: 'C432300Beatles',
        tag010Value: 'n79018119432300',
      },
    ];

    const createdRecordIDs = [];

    before('Creating user and data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C432300*');

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
            response.forEach((record) => {
              createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
          cy.wait(2000);
        });

        cy.loginAsAdmin().then(() => {
          TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
          cy.wait(1000);
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
          authRefresh: true,
        });
      });
    });

    after('Deleting created user and data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id, index) => {
        // attept to delete all authorities just in case deletion failed in test
        if (index) MarcAuthority.deleteViaAPI(id, true);
        else InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      });
    });

    it(
      'C432300 Retrieve UUIDs of deleted MARC authority records via API (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C432300'] },
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
