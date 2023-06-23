import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import { LOCALION_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
  MATERIAL_TYPE_NAMES,
  LOAN_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ACQUISITION_METHOD_NAMES,
  JOB_STATUS_NAMES } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import OrderLines from '../../../support/fragments/orders/orderLines';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/itemRecordView';

describe('ui-data-import', () => {
  let user;
  const filePathForCreateOrder = 'marcFileForC375174.mrc';
  const marcFileName = `C375174 autotestFileName ${getRandomPostfix()}`;
  const mappingProfile = {
    name: `C375174 Test Order ${getRandomPostfix()}`,
    typeValue: FOLIO_RECORD_TYPE.ORDER,
    orderStatus: ORDER_STATUSES.PENDING,
    approved: true,
    vendor: 'GOBI Library Solutions',
    reEncumber: 'false',
    title: '245$a',
    mustAcknowledgeReceivingNote: 'false',
    publicationDate: '264$c; else 260$c',
    publisher: '264$b; else 260$b',
    edition: '250$a',
    internalNote: '981$d',
    acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
    orderFormat: 'Physical Resource',
    receiptStatus: 'Pending',
    paymentStatus: 'Pending',
    selector: '981$e',
    cancellationRestriction: 'false',
    rush: '981$h',
    receivingWorkflow: 'Synchronized',
    accountNumber: '981$g',
    physicalUnitPrice: '980$b',
    quantityPhysical: '980$g',
    currency: 'USD',
    materialSupplier: 'GOBI Library Solutions',
    createInventory: 'Instance, Holding, Item',
    materialType: 'book',
    contributor: '100$a',
    contributorType: 'Personal name',
    productId: '020$a',
    qualifier: '020$q',
    productIDType: 'ISBN',
    vendorReferenceNumber: '980$f',
    vendorReferenceType: 'Vendor order reference number',
    fundId: '981$b',
    expenseClass: '981$c',
    value: '100',
    type: '%',
    locationName: '049$a',
    locationQuantityPhysical: '980$g',
    volume: '993$a'
  };
  const actionProfile = {
    typeValue: FOLIO_RECORD_TYPE.ORDER,
    name: `C375174 Test Order ${getRandomPostfix()}`
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C375174 Test Order ${getRandomPostfix()}`,
  };

  before('login', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.uiOrganizationsView.gui,
      permissions.inventoryAll.gui,
      permissions.uiOrdersView.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  it('C375174 Verify the importing of orders with pending status (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create mapping profile
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillPhysicalOrderMappingProfile(mappingProfile);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfile.name);

      // create action profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(actionProfile.name);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePathForCreateOrder, marcFileName);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(marcFileName);
      
    });
});
