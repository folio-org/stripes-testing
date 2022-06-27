import TestTypes from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import Helper from '../../support/fragments/finance/financeHelper';
import PoNumber from '../../support/fragments/settings/orders/poNumber';
import TopMenu from '../../support/fragments/topMenu';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import SettingsMenu from '../../support/fragments/settingsMenu';

describe('ui-users:', () => {
  const firstTitle = 'Sport and sociology / Dominic Malcolm.';
  const secondTitle = 'South Asian texts in history : critical engagements with Sheldon Pollock / edited by Yigal Bronner, Whitney Cox, and Lawrence McCrea.';
  let vendorId;
  let locationId;
  let materialTypeId;
  let acquisitionMethodId;
  let productIdTypeId;
  const firstOrderNumber = 'auto99999test';
  const secondOrderNumber = 'auto100000test';
  const itemQuantity = '1';
  const price = '20';
  let user = {};
  const orderNumbers = [firstOrderNumber, secondOrderNumber];

  // unique profile names
  const jobProfileName = `autotestJobProf${getRandomPostfix()}`;
  const actionProfileNameForInstance = `autotestActionInstance${getRandomPostfix()}`;
  const actionProfileNameForHoldings = `autotestActionHoldings${getRandomPostfix()}`;
  const actionProfileNameForItem = `autotestActionItem${getRandomPostfix()}`;
  const mappingProfileNameForInstance = `C350590 Update Instance by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForHoldings = `C350590 Update Holdings by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForItem = `C350590 Update Item by POL match ${getRandomPostfix()}`;

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        cy.getOrganizationApi({ query: 'name="GOBI Library Solutions"' })
          .then(organization => {
            vendorId = organization.id;
          });
        cy.getLocations({ limit:1 })
          .then(location => {
            locationId = location.id;
          });
        cy.getMaterialTypes({ query: 'name="book"' })
          .then(materialType => {
            materialTypeId = materialType.id;
          });
        cy.getAcquisitionMethodsApi({ query: 'value="Purchase at vendor system"' })
          .then(params => {
            acquisitionMethodId = params.body.acquisitionMethods[0].id;
          });
        cy.getProductIdTypes({ query: 'name=="ISBN"' })
          .then(productIdType => {
            productIdTypeId = productIdType.id;
          });
      })
      .then(() => {
        PoNumber.getViaApi({ query: 'configName="orderNumber"' })
          .then((res) => {
            PoNumber.editViaApi(res[0].id);
          });
        Orders.createOrderWithOrderLineViaApi(NewOrder.getDefaultOrder(vendorId, firstOrderNumber),
          BasicOrderLine.getDefaultOrderLine(itemQuantity, firstTitle, locationId, acquisitionMethodId, price, price, [{ productId: '9782266111560', productIdType:productIdTypeId }], materialTypeId));
        Orders.createOrderWithOrderLineViaApi(NewOrder.getDefaultOrder(vendorId, secondOrderNumber),
          BasicOrderLine.getDefaultOrderLine(itemQuantity, secondTitle, locationId, acquisitionMethodId, price, price, [{ productId: '9782266111560', productIdType:productIdTypeId }], materialTypeId));
      });

    cy.createTempUser([
      permissions.createOrdersAndOrderLines.gui,
      permissions.editOrdersAndOrderLines.gui,
      permissions.viewOrdersAndOrderLines.gui,
      permissions.uiInventoryViewCreateEditHoldings.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiInventoryViewCreateEditItems,
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui,
    ])
      .then(userProperties => {
        user = userProperties;
      })
      .then(() => {
        cy.login(user.username, user.password);
        orderNumbers.forEach(number => {
          cy.visit(TopMenu.ordersPath);
          Orders.searchByParameter('PO number', number);
          Helper.selectFromResultsList();
          Orders.openOrder();
        });
      });
  });

  it('C350590 Match on POL and update related Instance, Holdings, Item', { tags: [TestTypes.smoke] }, () => {
    const collectionOfProfiles = [
      {
        mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.instance,
          name: mappingProfileNameForInstance },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
          name: actionProfileNameForInstance }
      },
      {
        mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.holdings,
          name: mappingProfileNameForHoldings },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
          name: actionProfileNameForHoldings }
      },
      {
        mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.item,
          name: mappingProfileNameForItem },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
          name: actionProfileNameForItem }
      }
    ];

    const specialJobProfile = { ...NewJobProfile.defaultJobProfile,
      profileName: jobProfileName,
      acceptedType: NewJobProfile.acceptedDataType.marc };

    collectionOfProfiles.forEach(profile => {
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.createMappingProfile(profile.mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(profile.mappingProfile.name);
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.createActionProfile(profile.actionProfile, profile.mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
    });
  });
});
