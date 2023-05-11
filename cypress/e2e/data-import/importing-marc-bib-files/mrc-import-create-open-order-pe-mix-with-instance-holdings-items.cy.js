import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import { LOCALION_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
  MATERIAL_TYPE_NAMES,
  LOAN_TYPE_NAMES } from '../../../support/constants';
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
  let instanceHrid;
  const quantityOfItems = '1';
  const marcFileName = `C380446 autotest file ${getRandomPostfix()}`;

  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { name: `C380446 Test P/E mix open order with instance, holdings, item ${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.ORDER,
        orderStatus: ORDER_STATUSES.OPEN,
        approved: true,
        vendor: 'GOBI Library Solutions',
        title: '245$a',
        acquisitionMethod: 'Approval Plan',
        orderFormat: 'P/E Mix',
        receivingWorkflow: 'Synchronized',
        physicalUnitPrice: '20',
        quantityPhysical: '1',
        currency: 'USD',
        electronicUnitPrice: '25',
        quantityElectronic: '1',
        locationName: LOCALION_NAMES.ANNEX,
        locationQuantityPhysical: '1',
        locationQuantityElectronic: '1' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ORDER,
        name: `C380446 Test P/E mix open order with instance, holdings, item ${getRandomPostfix()}` }
    },
    {
      mappingProfile: { name: `C380446 Create simple holdings for open order ${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        permanentLocation: `"${LOCALION_NAMES.MAIN_LIBRARY}"`,
        permanentLocationUI: LOCALION_NAMES.MAIN_LIBRARY_UI },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C380446 Create simple holdings for open order ${getRandomPostfix()}` }
    },
    {
      mappingProfile: { name: `C380446 Create simple item for open order ${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.ITEM,
        materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
        permanentLoanType: LOAN_TYPE_NAMES.COURSE_RESERVES,
        status: ITEM_STATUS_NAMES.ON_ORDER },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C380446 Create simple item for open order ${getRandomPostfix()}` }
    },
  ];
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C380446 Test P/E mix open order with instance, holdings, item ${getRandomPostfix()}`,
  };

  before('create test data', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.uiOrganizationsView.gui,
      permissions.inventoryAll.gui,
      permissions.uiOrdersView.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    collectionOfMappingAndActionProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C380446 Import to create open orders: P/E mix with Instances, Holdings, Items (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      // create mapping profiles
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillOrderMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile);
      NewFieldMappingProfile.fillMaterialType(collectionOfMappingAndActionProfiles[2].mappingProfile.materialType);
      NewFieldMappingProfile.fillPermanentLoanType(collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(collectionOfMappingAndActionProfiles[2].mappingProfile.status);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile.name);

      // create action profiles
      collectionOfMappingAndActionProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
      NewJobProfile.linkActionProfileByName('Default - Create instance');
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[2].actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile('marcFileForC380446.mrc', marcFileName);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(marcFileName);
      [FileDetails.columnNameInResultList.srsMarc,
        FileDetails.columnNameInResultList.instance,
        FileDetails.columnNameInResultList.holdings,
        FileDetails.columnNameInResultList.item
      ].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      FileDetails.checkItemQuantityInSummaryTable(quantityOfItems);
      FileDetails.openOrderInInventory('Created');

      OrderLines.waitLoading();
      OrderLines.checkCreateInventory();
      OrderLines.getAssignedPOLNumber().then(initialNumber => {
        const polNumber = initialNumber;

        OrderLines.openLinkedInstance();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
          instanceHrid = initialInstanceHrId;
        });
        InstanceRecordView.verifyHotlinkToPOL(polNumber);
        InstanceRecordView.verifyIsHoldingsCreated(['Main Library >']);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.checkHoldingRecordViewOpened();
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion('Main Library >');
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.waitLoading();
        ItemRecordView.checkHotlinksToCreatedPOL(polNumber);
      });
    });
});
