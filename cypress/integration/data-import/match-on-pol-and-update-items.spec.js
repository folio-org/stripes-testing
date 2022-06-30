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
import Users from '../../support/fragments/users/users';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/match-profiles';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import ItemRecordView from '../../support/fragments/inventory/itemRecordView';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints';

describe('ui-users:', () => {
  const firstTitle = 'Sport and sociology / Dominic Malcolm.';
  const secondTitle = 'South Asian texts in history : critical engagements with Sheldon Pollock / edited by Yigal Bronner, Whitney Cox, and Lawrence McCrea.';
  const titles = [firstTitle, secondTitle];
  const firstOrderNumber = Helper.getRandomBarcode();
  const secondOrderNumber = Helper.getRandomBarcode();
  //const firstOrderNumber = 'auto99999test';
  //const secondOrderNumber = 'auto100000test';
  const orderNumbers = [firstOrderNumber, secondOrderNumber];
  let vendorId;
  let locationId;
  let materialTypeId;
  let acquisitionMethodId;
  let productIdTypeId;
  const itemQuantity = '1';
  const price = '20';
  let user = {};
  let servicePointId;

  // unique profile names
  const jobProfileName = `autotestJobProf${getRandomPostfix()}`;
  const matchProfileNameForInstance = `C350590 935 $a POL to Instance POL ${Helper.getRandomBarcode()}`;
  const matchProfileNameForHoldings = `C350590 935 $a POL to Holdings POL ${Helper.getRandomBarcode()}`;
  const matchProfileNameForItem = `C350590 935 $a POL to Item POL ${Helper.getRandomBarcode()}`;
  const actionProfileNameForInstance = `C350590 Update Instance by POL match ${Helper.getRandomBarcode()}`;
  const actionProfileNameForHoldings = `C350590 Update Holdings by POL match ${Helper.getRandomBarcode()}`;
  const actionProfileNameForItem = `C350590 Update Item by POL match ${getRandomPostfix()}`;
  const mappingProfileNameForInstance = `C350590 Update Instance by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForHoldings = `C350590 Update Holdings by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForItem = `C350590 Update Item by POL match ${getRandomPostfix()}`;

  const marcFileName = `C343335autotestFile.${getRandomPostfix()}.mrc`;

  before(() => {
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
            ServicePoints.getServicePointsApi()
              .then((servicePoint) => {
                servicePointId = servicePoint[0].id;
              });
          })
          .then(() => {
            /* PoNumber.getViaApi({ query: 'configName="orderNumber" and module="ORDERS"' })
          .then((res) => {
            PoNumber.editViaApi(res[0].id);
          }); */
            Orders.createOrderWithOrderLineViaApi(NewOrder.getDefaultOrder(vendorId, firstOrderNumber),
              BasicOrderLine.getDefaultOrderLine(
                itemQuantity,
                firstTitle,
                locationId,
                acquisitionMethodId,
                price,
                price,
                [{
                  productId: '9782266111560',
                  productIdType:productIdTypeId
                }],
                materialTypeId
              ))
              .then((number) => {
                cy.visit(TopMenu.ordersPath);
                Orders.searchByParameter('PO number', number);
                Helper.selectFromResultsList();
                Orders.openOrder();
              });
            Orders.createOrderWithOrderLineViaApi(NewOrder.getDefaultOrder(vendorId, secondOrderNumber),
              BasicOrderLine.getDefaultOrderLine(
                itemQuantity,
                secondTitle,
                locationId,
                acquisitionMethodId,
                price,
                price,
                [{
                  productId: '9783161484100',
                  productIdType:productIdTypeId
                }],
                materialTypeId
              ))
              .then((number) => {
                cy.visit(TopMenu.ordersPath);
                Orders.searchByParameter('PO number', number);
                Helper.selectFromResultsList();
                Orders.openOrder();
              });
          });
      });
  });

  after(() => {
    let itemId;
    const itemBarcode = Helper.getRandomBarcode();

    titles.forEach(title => {
      cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${title}"` })
        .then((instance) => {
          itemId = instance.items[0].id;

          cy.getItems({ query: `"id"=="${itemId}"` })
            .then((item) => {
              item.barcode = itemBarcode;
              cy.wrap(ItemRecordView.editItem(item))
                .then(() => {
                  CheckInActions.createItemCheckinApi({
                    itemBarcode: item.barcode,
                    servicePointId,
                    checkInDate: new Date().toISOString(),
                  })
                    .then(() => {
                      cy.deleteItem(itemId);
                      cy.deleteHoldingRecord(instance.holdings[0].id);
                      cy.deleteInstanceApi(instance.id);
                    });
                });
            });
        });
    });
    orderNumbers.forEach(number => {
      Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${number}"` })
        .then(order => {
          console.log(order);
          // Orders.deleteOrderApi(order[0].id);
        });
    });
    Users.deleteViaApi(user.userId);
  });

  it('C350590 Match on POL and update related Instance, Holdings, Item', { tags: [TestTypes.smoke] }, () => {
    const collectionOfProfiles = [
      {
        mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.instance,
          name: mappingProfileNameForInstance },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
          name: actionProfileNameForInstance,
          action: 'Update (all record types except Orders)' }
      },
      {
        mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.holdings,
          name: mappingProfileNameForHoldings },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
          name: actionProfileNameForHoldings,
          action: 'Update (all record types except Orders)' }
      },
      {
        mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.item,
          name: mappingProfileNameForItem },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
          name: actionProfileNameForItem,
          action: 'Update (all record types except Orders)' }
      }
    ];

    // create Match profile
    const collectionOfMatchProfiles = [
      {
        matchProfile: { profileName: matchProfileNameForInstance,
          incomingRecordFields: {
            field: '935',
            subfield:'a'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'INSTANCE' }
      },
      {
        matchProfile: { profileName: matchProfileNameForHoldings,
          incomingRecordFields: {
            field: '935',
            subfield: 'a'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'HOLDINGS' }
      },
      {
        matchProfile: {
          profileName: matchProfileNameForItem,
          incomingRecordFields: {
            field: '935',
            subfield: 'a'
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'ITEM'
        }
      }
    ];

    const specialJobProfile = { ...NewJobProfile.defaultJobProfile,
      profileName: jobProfileName,
      acceptedType: NewJobProfile.acceptedDataType.marc };

    collectionOfProfiles.forEach(profile => {
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.createMappingProfileForMatch(profile.mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(profile.mappingProfile.name);
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.createActionProfile(profile.actionProfile, profile.mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
    });

    cy.visit(SettingsMenu.matchProfilePath);
    collectionOfMatchProfiles.forEach(profile => {
      MatchProfiles.createMatchProfileForPol(profile.matchProfile);
    });

    cy.visit(SettingsMenu.mappingProfilePath);
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(specialJobProfile);
    collectionOfProfiles.forEach(profile => {
      NewJobProfile.linkActionProfile(profile.actionProfile);
    });
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(specialJobProfile.profileName);

    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfilesForUpdate(specialJobProfile);
    NewJobProfile.linkMatchAndActionProfilesForInstance(actionProfileNameForInstance, matchProfileNameForInstance, 0);
    NewJobProfile.linkMatchAndActionProfilesForHoldings(actionProfileNameForHoldings, matchProfileNameForHoldings, 2);
    NewJobProfile.linkMatchAndActionProfilesForItem(actionProfileNameForItem, matchProfileNameForItem, 4);
    NewJobProfile.saveAndClose();


    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('matchOnPOL.mrc', marcFileName);
    JobProfiles.searchJobProfileForImport(jobProfileName);
    JobProfiles.runImportFile(marcFileName);
    Logs.openFileDetails(marcFileName);
  });
});
