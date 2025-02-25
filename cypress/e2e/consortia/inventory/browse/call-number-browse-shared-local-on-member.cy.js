import Permissions from '../../../../support/dictionary/permissions';
import Affiliations from '../../../../support/dictionary/affiliations';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const permissions = [Permissions.uiInventoryViewInstances.gui];
    let callNumberTypes = null;
    let folioInstances = null;
    let currentLocation = null;
    const getIdByName = (name) => callNumberTypes.find((type) => type.name === name).id;
    const generateFolioInstancesPayload = () => {
      return [
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance1 ${getRandomPostfix()}`,
          itemsProperties: {
            itemLevelCallNumber: '595.0994',
            itemLevelCallNumberTypeId: getIdByName('Dewey Decimal classification'),
          },
        }),
      ].flat();
    };
    const testData = {
      folioInstances: [
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance1 ${getRandomPostfix()}`,
          itemsProperties: {
            itemLevelCallNumber: '595.0994',
            itemLevelCallNumberTypeId: getIdByName('Dewey Decimal classification'),
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance2 ${getRandomPostfix()}`,
          itemsProperties: {
            itemLevelCallNumber: 'QS 11 .GA1 E59 2005',
            itemLevelCallNumberTypeId: getIdByName('Library of Congress classification'),
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance3 ${getRandomPostfix()}`,
          itemsProperties: {
            itemLevelCallNumber: 'SB999.A5',
            itemLevelCallNumberTypeId: 'National Library of Medicine classification',
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance4 ${getRandomPostfix()}`,
          itemsProperties: {
            itemLevelCallNumber: 'Valery P',
            itemLevelCallNumberTypeId: 'Other scheme',
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance5 ${getRandomPostfix()}`,
          itemsProperties: {
            itemLevelCallNumber: 'L39.s:Oc1/2/991',
            itemLevelCallNumberTypeId: 'Superintendent of Documents classification',
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance6 ${getRandomPostfix()}`,
          itemsProperties: {
            itemLevelCallNumber: 'VP000333',
            itemLevelCallNumberTypeId: 'Local',
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance7 ${getRandomPostfix()}`,
          itemsProperties: {
            itemLevelCallNumber: 'ECS test 01',
          },
        }),
        InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: `AT_C651515 Instance8 ${getRandomPostfix()}`,
          itemsProperties: {
            itemLevelCallNumber: 'UDC test 01',
            itemLevelCallNumberTypeId: 'UDC',
          },
        }),
      ],
      servicePoint: ServicePoints.getDefaultServicePoint(),
    };

    before('Create user, data', () => {
      cy.getAdminToken();

      CallNumberTypes.getCallNumberTypesViaAPI()
        .then((types) => {
          callNumberTypes = types;
          folioInstances = generateFolioInstancesPayload();
          testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
          Location.createViaApi(testData.defaultLocation).then((location) => {
            currentLocation = location;
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances,
              currentLocation,
            });
          });
        })
        .then(() => {
          cy.setTenant(Affiliations.College);
          testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
          Location.createViaApi(testData.defaultLocation).then((location) => {
            currentLocation = location;
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances,
              currentLocation,
            });
          });
        });

      cy.resetTenant();
      cy.createTempUser(permissions).then((userProperties) => {
        testData.userProperties = userProperties;
        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: testData.userProperties.userId,
          permissions,
        });
      });
    });

    after('Delete user, data', () => {});

    it(
      'C651515 Call number of each type which belong to Shared and Local Instances could be found by call number browse from Member tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C651515'] },
      () => {},
    );
  });
});
