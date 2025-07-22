import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import DateTools from '../../../support/utils/dateTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
  INVENTORY_LDR_FIELD_STATUS_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES,
  INVENTORY_007_FIELD_TYPE_DROPDOWN,
} from '../../../support/constants';

describe('Inventory', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: 'AT_C692100_MarcBibInstance',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        tagLdr: 'LDR',
        tag008: '008',
        tag006: '006',
        tag007: '007',
      };
      const dropdownUpdates = [
        [
          testData.tagLdr,
          INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          INVENTORY_LDR_FIELD_STATUS_DROPDOWN.A,
        ],
        [
          testData.tag007,
          INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.TYPE,
          INVENTORY_007_FIELD_TYPE_DROPDOWN.M,
        ],
        [
          testData.tag008,
          INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
          INVENTORY_008_FIELD_DTST_DROPDOWN.T,
        ],
      ];
      const textUpdates = [
        [testData.tag006, INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES.AUDN, 's'],
        [testData.tag007, INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES.SMD, 't'],
        [testData.tag008, INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DATE1, '2010'],
      ];
      const versionHistorySourceCardsData = [
        {
          isOriginal: false,
          isCurrent: true,
          changes: [
            { text: 'Field 006', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field 007', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field 008', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
          ],
        },
        { isOriginal: true, isCurrent: false },
      ];
      const changesModalSourceData = [
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: testData.tag006,
          from: 'm    |   d |      ',
          to: 'm    s   d |      ',
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: testData.tag007,
          from: 'cr |n|---||||a',
          to: 'mt |   n               ',
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: testData.tag008,
          from: '061024s2006    vau    |s ||||||| ||eng|d',
          to: '061024t2010    vau    |s ||||||| ||eng|d',
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: testData.tagLdr,
          from: '01035nam a22003013i 4500',
          to: '01044aam a22003013i 4500',
        },
      ];
      const permissions = [
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ];
      const marcFile = {
        marc: 'marcBibFileC692100.mrc',
        fileName: `testMarcFileC692100_${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C692100');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getAdminUserDetails().then(
            (user) => {
              testData.adminLastName = user.personal.lastName;
              testData.adminFirstName = user.personal.firstName;

              [versionHistorySourceCardsData].forEach((cardData, index) => {
                if (index) {
                  cardData.firstName = testData.adminFirstName;
                  cardData.lastName = testData.adminLastName;
                } else {
                  cardData.firstName = userProperties.firstName;
                  cardData.lastName = userProperties.lastName;
                }
              });
            },
          );

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            testData.createdRecordId = response[0].instance.id;
            cy.enableVersionHistoryFeature(true);

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
            InventoryInstances.searchByTitle(testData.createdRecordId);
            InventoryInstances.selectInstanceById(testData.createdRecordId);
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C692100 Check "Version history" pane after CRUD multiple repeatable fields and subfields in "MARC bibliographic" record via "quickmarc" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C692100'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          dropdownUpdates.forEach((dropdownUpdate) => {
            QuickMarcEditor.selectFieldsDropdownOption(...dropdownUpdate);
            QuickMarcEditor.verifyDropdownOptionChecked(...dropdownUpdate);
          });
          textUpdates.forEach((textUpdate) => {
            QuickMarcEditor.fillInTextBoxInField(...textUpdate);
            QuickMarcEditor.verifyTextBoxValueInField(...textUpdate);
          });
          cy.wait(3000);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          InventoryInstance.viewSource();
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(versionHistorySourceCardsData.length);
          versionHistorySourceCardsData.forEach((cardData, index) => {
            VersionHistorySection.verifyVersionHistoryCard(
              index,
              testData.date,
              cardData.firstName,
              cardData.lastName,
              cardData.isOriginal,
              cardData.isCurrent,
            );
            if (cardData.changes) {
              cardData.changes.forEach((change) => {
                VersionHistorySection.checkChangeForCard(index, change.text, change.action);
              });
              VersionHistorySection.checkChangesCountForCard(index, cardData.changes.length);
            }
          });

          VersionHistorySection.openChangesForCard();
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );
          changesModalSourceData.forEach((change) => {
            VersionHistorySection.checkChangeInModal(...Object.values(change));
          });
          VersionHistorySection.checkChangesCountInModal(changesModalSourceData.length);
        },
      );
    });
  });
});
