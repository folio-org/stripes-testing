import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    const testData = {
      bibFile: {
        marc: 'marcBibFileForC503234.mrc',
        fileName: `testMarcFileC503234.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
        instanceTitle:
          'C503234 Abraham Lincoln, by Lillian Hertz. Prize essay in Alexander Hamilton junior high school P.S. 186, June 24, 1927.',
      },
      authorityFiles: [
        {
          marc: 'marcAuthFileForC503234_1.mrc',
          fileName: `testMarcFileC503234_1.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'C503234 Robinson, Peter, 1950-2022',
          propertyName: 'authority',
        },
        {
          marc: 'marcAuthFileForC503234_2.mrc',
          fileName: `testMarcFileC503234_2.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'C503234 Speaking Oratory',
          propertyName: 'authority',
        },
      ],
      tag240: '240',
      tag650: '650',
      tag240FifthBoxValue: '$m test',
      tag650FifthBoxValue: '$b 123',
      tag650SeventhBoxValue: '$b 123',
      errorMessage:
        'A subfield(s) cannot be updated because it is controlled by an authority heading.',
    };

    const linkableFields = [
      {
        tag: testData.tag240,
        index: 10,
        authorityHeading: testData.authorityFiles[0].authorityHeading,
        fillBoxNumber: 5,
        fillValue: testData.tag240FifthBoxValue,
      },
      {
        tag: testData.tag650,
        index: 16,
        authorityHeading: testData.authorityFiles[1].authorityHeading,
        fillBoxNumber: 5,
        fillValue: testData.tag650FifthBoxValue,
      },
      {
        tag: testData.tag650,
        index: 17,
        authorityHeading: testData.authorityFiles[1].authorityHeading,
        fillBoxNumber: 7,
        fillValue: testData.tag650SeventhBoxValue,
      },
    ];

    const createdRecordIDs = [];

    before('Import data, link records', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C503234*');
        InventoryInstances.deleteFullInstancesByTitleViaApi('C503234*');
        DataImport.uploadFileViaApi(
          testData.bibFile.marc,
          testData.bibFile.fileName,
          testData.bibFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[testData.bibFile.propertyName].id);
          });
        });

        testData.authorityFiles.forEach((authFile) => {
          DataImport.uploadFileViaApi(
            authFile.marc,
            authFile.fileName,
            authFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[authFile.propertyName].id);
            });
          });
        });

        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.waitContentLoading();
        }, 20_000).then(() => {
          InventoryInstances.searchByTitle(testData.bibFile.instanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();

          linkableFields.forEach((field) => {
            InventoryInstance.verifyAndClickLinkIconByIndex(field.index);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(field.authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(field.index, field.tag);
          });
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.waitContentLoading();
          }, 20_000);
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
        else InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C503234 Add controllable subfields to multiple linked fields in "MARC bib" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C503234'] },
      () => {
        InventoryInstances.searchByTitle(testData.bibFile.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();

        linkableFields.forEach((field) => {
          QuickMarcEditor.fillLinkedFieldBox(field.index, field.fillBoxNumber, field.fillValue);
        });

        QuickMarcEditor.pressSaveAndCloseButton();

        linkableFields.forEach((field) => {
          QuickMarcEditor.checkErrorMessage(field.index, testData.errorMessage);
        });
        QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
      },
    );
  });
});
