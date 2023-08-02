import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
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
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';
import { LOCATION_NAMES,
  LOAN_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  FOLIO_RECORD_TYPE,
  MATERIAL_TYPE_NAMES,
  JOB_STATUS_NAMES } from '../../../support/constants';

describe('ui-data-import', () => {
  let user;
  let instanceHrid;
  const quantityOfItems = '1';
  const instanceTitle = 'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)';
  const nameMarcFile = `C356801autotestFile.${getRandomPostfix}.mrc`;
  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C356801 instance mapping profile ${getRandomPostfix}` },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C356801 instance action profile ${getRandomPostfix}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C356801 holdings mapping profile ${getRandomPostfix}`,
        pernanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
        pernanentLocationUI: LOCATION_NAMES.ONLINE_UI },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C356801 holdings action profile ${getRandomPostfix}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C356801 item mapping profile ${getRandomPostfix}`,
        permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        status: ITEM_STATUS_NAMES.AVAILABLE,
        materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"` },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C356801 item action profile ${getRandomPostfix}` }
    }
  ];
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C356801 job profile ${getRandomPostfix}`
  };

  before('create test data', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiInventoryViewInstances.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after('delete test data', () => {
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    collectionOfMappingAndActionProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C356801 Check import summary table with "Created" actions for instance, holding and item (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create mapping profiles
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(collectionOfMappingAndActionProfiles[1].mappingProfile.pernanentLocation);
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
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[2].actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      // upload a marc file for creating of the new instance, holding and item
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile('oneMarcBib.mrc', nameMarcFile);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFile);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(nameMarcFile);

      // check created instance
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        instanceHrid = initialInstanceHrId;
      });
      InventoryInstance.checkIsInstancePresented(
        instanceTitle,
        collectionOfMappingAndActionProfiles[1].mappingProfile.pernanentLocationUI,
        collectionOfMappingAndActionProfiles[2].mappingProfile.status
      );
      cy.go('back');

      [FileDetails.columnNameInResultList.srsMarc,
        FileDetails.columnNameInResultList.instance,
        FileDetails.columnNameInResultList.holdings,
        FileDetails.columnNameInResultList.item
      ].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      // check Created counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(0, quantityOfItems);
      // check Updated counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(1, '0');
      // check No action counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(2, '0');
      // check Error counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(3, '0');
    });
});
