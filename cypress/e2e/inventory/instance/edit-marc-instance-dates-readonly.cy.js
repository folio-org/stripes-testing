import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { INSTANCE_DATE_TYPES } from '../../../support/constants';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C552533_MarcBibInstance_${getRandomPostfix()}`,
        tag245: '245',
        tag008: '008',
        dateTypeText: INSTANCE_DATE_TYPES.REPRINT,
        date1: '2055',
        date2: '2057',
      };
      const marcInstanceFields = [
        {
          tag: '008',
          content: {
            ...QuickMarcEditor.defaultValid008Values,
            Date1: testData.date1,
            Date2: testData.date2,
            DtSt: 'r',
          },
        },
        {
          tag: '245',
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
      ];
      let instanceId;
      let user;

      before('Creating data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewCreateEditInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((id) => {
            instanceId = id;
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
          });
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      it(
        'C552533 "Date type" and "Date 1", "Date 2" fields are read-only on "Edit instance" pane opened for MARC bib (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C552533'] },
        () => {
          InventoryInstances.searchByTitle(instanceId);
          InventoryInstances.selectInstanceById(instanceId);
          InventoryInstance.waitLoading();
          InstanceRecordView.edit();
          InstanceRecordEdit.verifyDateFieldsValues(
            testData.date1,
            testData.date2,
            testData.dateTypeText,
            false,
          );
        },
      );
    });
  });
});
