import { Permissions } from '../../../support/dictionary';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  const randomPostfix = getRandomPostfix();
  const randomDigits = randomFourDigitNumber();
  const originalLocNumber = `490903${randomDigits}${randomDigits}`;
  const locNumber = '2012457191';
  const originalInstanceTitle = `AT_C490903_MarcBibInstance_${randomPostfix}`;
  const instanceTitle =
    'Shokubutsu seirigaku = Plant physiology / Mimura Tetsurō, Tsurumi Seiji hencho.';
  const field008EnteredValue = '120831';

  let user;
  let instanceId;
  let identifierTypeId;
  let instanceTypeId;

  describe('Single record import', () => {
    before('Create test user and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
      InventoryInstances.deleteInstanceByTitleViaApi(originalInstanceTitle);

      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
      ])
        .then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          InventoryInstances.getIdentifierTypes({ query: 'name=="LCCN"' }).then(
            (identifierType) => {
              identifierTypeId = identifierType.id;
            },
          );
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: originalInstanceTitle,
              identifiers: [
                {
                  value: originalLocNumber,
                  identifierTypeId,
                },
              ],
            },
          }).then((instanceData) => {
            instanceId = instanceData.instanceId;

            cy.toggleLocSingleImportProfileViaAPI();

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
      InventoryInstances.deleteInstanceByTitleViaApi(originalInstanceTitle);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C397982 Overlay existing record by import of single MARC record from LC (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C397982'] },
      () => {
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(originalInstanceTitle);
        InventoryInstance.verifySourceInAdministrativeData(INSTANCE_SOURCE_NAMES.FOLIO);
        InventoryActions.overlayLoc(locNumber);
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(instanceTitle);

        InventoryInstance.viewSource();
        InventoryViewSource.contains(locNumber);
        InventoryViewSource.close();

        cy.intercept('/records-editor/records*').as('getRecord');
        InventoryInstance.editMarcBibliographicRecord();
        cy.wait('@getRecord').then(({ response }) => {
          const field008Data = response.body.fields.find((field) => field.tag === '008');
          expect(field008Data.content.Entered).to.equal(field008EnteredValue);
        });
      },
    );
  });
});
