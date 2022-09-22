import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Orders from '../../support/fragments/orders/orders';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import SettingsMenu from '../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import Helper from '../../support/fragments/finance/financeHelper';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import OrderView from '../../support/fragments/orders/orderView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import Users from '../../support/fragments/users/users';

describe('ui-data-import: Match on POL and update related Instance, Holdings, Item', () => {
  let user = null;
  let vendorId;
  let location;
  let acquisitionMethodId;
  let productIdTypeId;
  let materialTypeId;
  let servicePointId;
  let orderNumber;

  // unique profile names
  const jobProfileName = `C350944 Update Instance, and create Holdings, Item based on POL match ${getRandomPostfix()}`;
  const matchProfileName = `C350944 935 $a POL to Instance POL ${Helper.getRandomBarcode()}`;
  const actionProfileNameForInstance = `C350944 Update Instance by POL match ${Helper.getRandomBarcode()}`;
  const actionProfileNameForHoldings = `C350944 Create Holdings by POL match ${Helper.getRandomBarcode()}`;
  const actionProfileNameForItem = `C350944 Create Item by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForInstance = `C350944 Update Instance by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForHoldings = `C350944 Create Holdings by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForItem = `C350944 Create Item by POL match ${getRandomPostfix()}`;

  // unique file names
  const nameMarcFileForCreate = `C350944 autotestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `C350944 marcFileForMatchOnPol.${getRandomPostfix()}.mrc`;
  const marcFileName = `C350944 autotestFile.${getRandomPostfix()}.mrc`;

  const collectionOfProfiles = [
    {
      mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.instance,
        name: mappingProfileNameForInstance },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
        name: actionProfileNameForInstance,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.holdings,
        name: mappingProfileNameForHoldings },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: actionProfileNameForHoldings,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: NewMappingProfile.folioRecordTypeValue.item,
        name: mappingProfileNameForItem },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: actionProfileNameForItem,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    }
  ];

  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '935',
      subfield:'a'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: NewMatchProfile.optionsList.pol
  };

  const jobProfile = { ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc };

  const item = {
    title: 'Sport and sociology. $cDominic Malcolm.',
    productId: '9782266111560',
    quantity: '1',
    price: '20',
    createInventory: 'None'
  };

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersView.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiInventoryViewCreateEditHoldings.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiInventoryViewCreateEditItems,
      permissions.uiInventoryViewInstances.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui
    ])
      .then(userProperties => {
        user = userProperties;
      })
      .then(() => {
        cy.getAdminToken()
          .then(() => {
            Organizations.getOrganizationViaApi({ query: 'name="GOBI Library Solutions"' })
              .then(organization => {
                vendorId = organization.id;
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
            ServicePoints.getViaApi()
              .then((servicePoint) => {
                servicePointId = servicePoint[0].id;
                NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId))
                  .then(res => {
                    location = res;
                  });
              });
          })
          .then(() => {
            cy.login(user.username, user.password);
          });
      });
  });

  //   after(() => {

  //   });

  const createInstanceMappingProfile = (instanceMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    NewMappingProfile.fillCatalogedDate('###TODAY###');
    NewMappingProfile.fillInstanceStatusTerm();
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfile.name);
  };

  const createHoldingsMappingProfile = (holdingsMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
    NewMappingProfile.fillHoldingsType('"Monograph"');
    NewMappingProfile.fillPermanentLocation('980$a');
    NewMappingProfile.fillCallNumberType('"Library of Congress classification"');
    NewMappingProfile.fillCallNumber('980$b " " 980$c');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfile.name);
  };

  const createItemMappingProfile = (itemMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
    NewMappingProfile.fillBarcode('981$b');
    NewMappingProfile.fillCopyNumber('981$a');
    NewMappingProfile.fillStatus('"Available"');
    NewMappingProfile.fillPermanentLoanType('"Can circulate"');
    NewMappingProfile.fillMaterialType('"book"');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfile.name);
  };

  it('C350590 Match on POL and update related Instance, Holdings, Item (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // create mapping and action profiles
    cy.visit(SettingsMenu.mappingProfilePath);
    createInstanceMappingProfile(collectionOfProfiles[0].mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfiles[0].mappingProfile.name);
    createHoldingsMappingProfile(collectionOfProfiles[1].mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfiles[1].mappingProfile.name);
    createItemMappingProfile(collectionOfProfiles[2].mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfiles[2].mappingProfile.name);

    // create action profiles
    collectionOfProfiles.forEach(profile => {
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.createActionProfile(profile.actionProfile, profile.mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
    });

    // create match profile
    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);
    MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

    // createjob profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfile);
    collectionOfProfiles.forEach(profile => {
      NewJobProfile.linkActionProfile(profile.actionProfile);
    });
    NewJobProfile.saveAndClose();
    JobProfiles.checkJobProfilePresented(jobProfile.profileName);

    // upload a marc file for creating of the new instance, holding and item
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('marcFileForMatchOnPol.mrc', nameMarcFileForCreate);
    JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    JobProfiles.runImportFile(nameMarcFileForCreate);
    Logs.openFileDetails(nameMarcFileForCreate);
    FileDetails.checkItemsStatusesInResultList(0, [FileDetails.status.created, FileDetails.status.created]);
    FileDetails.checkItemsStatusesInResultList(1, [FileDetails.status.created, FileDetails.status.created]);

    // create PO with POL
    cy.visit(TopMenu.ordersPath);
    Orders.createOrderWithOrderLineViaApi(NewOrder.getDefaultOrder(vendorId),
      BasicOrderLine.getDefaultOrderLine(
        item.quantity,
        item.title,
        location.id,
        acquisitionMethodId,
        item.price,
        item.price,
        [{
          productId: item.productId,
          productIdType: productIdTypeId
        }],
        materialTypeId,
        item.createInventory
      ))
      .then(res => {
        orderNumber = res;

        Orders.checkIsOrderCreated(orderNumber);
        // open the first PO with POL
        Orders.searchByParameter('PO number', orderNumber);
        Helper.selectFromResultsList();
        Orders.openOrder();
        OrderView.checkIsOrderOpened('Open');
        OrderView.checkIsItemsInInventoryCreated(item.title, location.name);

        DataImport.editMarcFile('marcFileForMatchOnPol.mrc', editedMarcFileName, 'test', orderNumber);
      });

    // upload .mrc file
    cy.visit(TopMenu.dataImportPath);
    DataImport.checkIsLandingPageOpened();
    DataImport.uploadFile(editedMarcFileName, marcFileName);
    JobProfiles.searchJobProfileForImport(jobProfileName);
    JobProfiles.runImportFile(marcFileName);
    Logs.checkStatusOfJobProfile();
    Logs.openFileDetails(marcFileName);
    FileDetails.checkItemsStatusesInResultList(0, [FileDetails.status.updated, FileDetails.status.updated, FileDetails.status.created, FileDetails.status.created]);
    FileDetails.checkItemsStatusesInResultList(1, [FileDetails.status.dash, FileDetails.status.discarded, FileDetails.status.discarded, FileDetails.status.discarded]);

    // FileDetails.openInstanceInInventory();
    // InventoryInstance.checkIsInstanceUpdated();
    // HoldingsRecordView.checkIsHoldingsUpdated();
    // ItemVeiw.checkIsItemUpdated(firstItem.barcode);
    // InventoryViewSource.verifyBarcodeInMARCBibSource(firstItem.barcode);
  });
});
