import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Orders from '../../support/fragments/orders/orders';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
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
import OrderLines from '../../support/fragments/orders/orderLines';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';

describe('ui-data-import: Match on POL and update related Instance, Holdings, Item', () => {
  let user = null;
  let orderNumber;

  // unique profile names
  const jobProfileName = `C350944 Update Instance, and create Holdings, Item based on POL match ${Helper.getRandomBarcode()}`;
  const matchProfileName = `C350944 935 $a POL to Instance POL ${Helper.getRandomBarcode()}`;
  const actionProfileNameForInstance = `C350944 Update Instance by POL match ${Helper.getRandomBarcode()}`;
  const actionProfileNameForHoldings = `C350944 Create Holdings by POL match ${Helper.getRandomBarcode()}`;
  const actionProfileNameForItem = `C350944 Create Item by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForInstance = `C350944 Update Instance by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForHoldings = `C350944 Create Holdings by POL match ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForItem = `C350944 Create Item by POL match ${Helper.getRandomBarcode()}`;

  // unique file names
  const nameMarcFileForCreate = `C350944 autotestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `C350944 marcFileForMatchOnPol.${getRandomPostfix()}.mrc`;
  const marcFileName = `C350944 autotestFile.${getRandomPostfix()}.mrc`;

  const collectionOfProfiles = [
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance,
        name: mappingProfileNameForInstance },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
        name: actionProfileNameForInstance,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.holdings,
        name: mappingProfileNameForHoldings },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: actionProfileNameForHoldings }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.item,
        name: mappingProfileNameForItem },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: actionProfileNameForItem }
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

  const order = { ...NewOrder.defaultOneTimeOrder,
    vendor: 'GOBI Library Solutions',
    orderType: 'One-time' };

  const pol = {
    title: 'Sport and sociology. Dominic Malcolm.',
    acquisitionMethod: 'Purchase at vendor system',
    orderFormat: 'Physical resource',
    quantity: '1',
    price: '20',
    materialType: 'book',
    createInventory: 'None'
  };

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersView.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiApproveOrder.gui,
      permissions.uiInventoryViewCreateEditHoldings.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiInventoryViewCreateEditItems,
      permissions.uiInventoryViewInstances.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password);
        cy.getAdminToken();
      });
  });

  after(() => {
    // delete generated profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    MatchProfiles.deleteMatchProfile(matchProfile.profileName);
    collectionOfProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` })
      .then(orderId => {
        Orders.deleteOrderApi(orderId[0].id);
      });
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${pol.title}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  const createInstanceMappingProfile = (instanceMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    NewFieldMappingProfile.fillCatalogedDate('###TODAY###');
    NewFieldMappingProfile.fillInstanceStatusTerm();
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfile.name);
  };

  const createHoldingsMappingProfile = (holdingsMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
    NewFieldMappingProfile.fillHoldingsType('"Monograph"');
    NewFieldMappingProfile.fillPermanentLocation('980$a');
    NewFieldMappingProfile.fillCallNumberType('"Library of Congress classification"');
    NewFieldMappingProfile.fillCallNumber('980$b " " 980$c');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfile.name);
  };

  const createItemMappingProfile = (itemMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
    NewFieldMappingProfile.fillBarcode('981$b');
    NewFieldMappingProfile.fillCopyNumber('981$a');
    NewFieldMappingProfile.fillStatus('"Available"');
    NewFieldMappingProfile.fillPermanentLoanType('"Can circulate"');
    NewFieldMappingProfile.fillMaterialType('"book"');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfile.name);
  };

  const addPolToOrder = (title, method, format, price, quantity, inventory, type) => {
    OrderLines.addPOLine();
    OrderLines.fillPolByLinkTitle(title);
    OrderLines.addAcquisitionMethod(method);
    OrderLines.addOrderFormat(format);
    OrderLines.fillPhysicalUnitPrice(price);
    OrderLines.fillPhysicalUnitQuantity(quantity);
    OrderLines.addCreateInventory(inventory);
    OrderLines.addMaterialType(type);
    OrderLines.savePol();
  };

  it('C350944 Match on POL and update related Instance, Holdings, Item (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // create mapping profiles
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
      ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
    });

    // create match profile
    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);
    MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

    // create job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfile(jobProfile);
    NewJobProfile.linkMatchAndThreeActionProfiles(matchProfileName, actionProfileNameForInstance, actionProfileNameForHoldings, actionProfileNameForItem);
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
    Orders.createOrder(order, true).then(orderId => {
      Orders.getOrdersApi({ limit: 1, query: `"id"=="${orderId}"` })
        .then(res => {
          orderNumber = res[0].poNumber;
          Orders.checkIsOrderCreated(orderNumber);
          addPolToOrder(pol.title, pol.acquisitionMethod, pol.orderFormat, pol.price, pol.quantity, pol.createInventory, pol.materialType);
          OrderLines.backToEditingOrder();
          Orders.openOrder();

          // change file using order number
          DataImport.editMarcFile('marcFileForMatchOnPol.mrc', editedMarcFileName, ['test'], [orderNumber]);
        });
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
    FileDetails.checkItemsStatusesInResultList(1, [FileDetails.status.dash, FileDetails.status.discarded]);

    FileDetails.openInstanceInInventory('Updated');
    InventoryInstance.checkIsInstanceUpdated();
    InventoryInstance.checkIsHoldingsCreated(['Main Library >']);
    InventoryInstance.openHoldingsAccordion('Main Library >');
    InventoryInstance.checkIsItemCreated('242451241241');
    InventoryInstance.viewSource();
    InventoryViewSource.verifyBarcodeInMARCBibSource('242451241241');
  });
});
