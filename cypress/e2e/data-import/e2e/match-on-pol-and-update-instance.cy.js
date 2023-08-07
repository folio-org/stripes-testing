import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import { LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  FOLIO_RECORD_TYPE,
  CALL_NUMBER_TYPE_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  ORDER_FORMAT_NAMES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  VENDOR_NAMES,
  LOCATION_NAMES,
  HOLDINGS_TYPE_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Orders from '../../../support/fragments/orders/orders';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('ui-data-import', () => {
  let user = null;
  let orderNumber;
  const itemBarcode = uuid();
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const instanceTitle = 'South Asian texts in history : critical engagements with Sheldon Pollock. edited by Yigal Bronner, Whitney Cox, and Lawrence McCrea.';
  // unique file names
  const nameMarcFileForCreate = `C350944 autotestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `C350944 marcFileForMatchOnPol.${getRandomPostfix()}.mrc`;
  const marcFileName = `C350944 autotestFile.${getRandomPostfix()}.mrc`;

  const collectionOfProfiles = [
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C350944 Update Instance by POL match ${getRandomPostfix()}` },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C350944 Update Instance by POL match ${getRandomPostfix()}`,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C350944 Create Holdings by POL match ${getRandomPostfix()}`,
        callNumberType: `"${CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS}"` },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C350944 Create Holdings by POL match ${getRandomPostfix()}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C350944 Create Item by POL match ${getRandomPostfix()}`,
        status: ITEM_STATUS_NAMES.AVAILABLE,
        permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"` },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C350944 Create Item by POL match ${getRandomPostfix()}` }
    }
  ];

  const matchProfile = {
    profileName: `C350944 935 $a POL to Instance POL ${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '935',
      subfield:'a'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
    instanceOption: NewMatchProfile.optionsList.pol
  };

  const jobProfile = { ...NewJobProfile.defaultJobProfile,
    profileName: `C350944 Update Instance, and create Holdings, Item based on POL match ${getRandomPostfix()}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC };

  const order = { ...NewOrder.defaultOneTimeOrder,
    vendor: VENDOR_NAMES.GOBI,
    orderType: 'One-time' };

  const pol = {
    title: 'Sport and sociology. Dominic Malcolm.',
    acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM,
    orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
    quantity: '1',
    price: '20',
    materialType: MATERIAL_TYPE_NAMES.BOOK,
    createInventory: 'None'
  };

  before('login', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersView.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
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

  after('delete test data', () => {
    // delete generated profiles
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    MatchProfiles.deleteMatchProfile(matchProfile.profileName);
    collectionOfProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` })
      .then(orderId => {
        Orders.deleteOrderViaApi(orderId[0].id);
      });
    Users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
    cy.getInstance({ limit: 1, expandAll: true, query: `"title"=="${instanceTitle}"` })
      .then(instance => {
        if (instance) {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        }
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
    NewFieldMappingProfile.fillHoldingsType(HOLDINGS_TYPE_NAMES.MONOGRAPH);
    NewFieldMappingProfile.fillPermanentLocation('980$a');
    NewFieldMappingProfile.fillCallNumberType(holdingsMappingProfile.callNumberType);
    NewFieldMappingProfile.fillCallNumber('980$b " " 980$c');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfile.name);
  };

  const createItemMappingProfile = (itemMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
    NewFieldMappingProfile.fillBarcode('981$b');
    NewFieldMappingProfile.fillCopyNumber('981$a');
    NewFieldMappingProfile.fillStatus(itemMappingProfile.status);
    NewFieldMappingProfile.fillPermanentLoanType(itemMappingProfile.permanentLoanType);
    NewFieldMappingProfile.fillMaterialType(itemMappingProfile.materialType);
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

  it('C350944 Match on POL and update related Instance with source MARC, create Holdings, Item records. (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
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
      NewJobProfile.linkMatchAndThreeActionProfiles(matchProfile.profileName, collectionOfProfiles[0].actionProfile.name, collectionOfProfiles[1].actionProfile.name, collectionOfProfiles[2].actionProfile.name);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      // upload a marc file for creating of the new instance, holding and item
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile('marcFileForC350944.mrc', nameMarcFileForCreate);
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForCreate);
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
            DataImport.editMarcFile('marcFileForC350944.mrc', editedMarcFileName, ['test', '242451241241'], [orderNumber, itemBarcode]);
          });
      });

      // upload .mrc file
      cy.visit(TopMenu.dataImportPath);
      DataImport.checkIsLandingPageOpened();
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(editedMarcFileName, marcFileName);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileName);
      Logs.checkStatusOfJobProfile();
      Logs.openFileDetails(marcFileName);
      FileDetails.checkItemsStatusesInResultList(0, [FileDetails.status.created, FileDetails.status.updated, FileDetails.status.created, FileDetails.status.created]);
      FileDetails.checkItemsStatusesInResultList(1, [FileDetails.status.dash, FileDetails.status.noAction]);

      FileDetails.openInstanceInInventory('Updated');
      InventoryInstance.checkIsInstanceUpdated();
      InventoryInstance.checkIsHoldingsCreated([`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`]);
      InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
      InventoryInstance.checkIsItemCreated(itemBarcode);
      InventoryInstance.viewSource();
      InventoryViewSource.verifyBarcodeInMARCBibSource(itemBarcode);
    });
});
