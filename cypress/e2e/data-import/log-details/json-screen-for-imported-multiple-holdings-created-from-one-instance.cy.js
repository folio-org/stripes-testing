import {
  ACCEPTED_DATA_TYPE_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const testData = {
      title:
        'Crossfire : a litany for survival : poems 1998-2019 / Staceyann Chin ; foreword by Jacqueline Woodson.',
      filePathForCreate: 'marcFileForC389471.mrc',
      marcFileName: `C389471 autotestFileName${getRandomPostfix()}.mrc`,
      arrayOfHoldingsStatuses: ['Created (KU/CC/DI/M)', 'Created (KU/CC/DI/A)'],
      quantityOfCreatedHoldings: 2,
      jsonHoldingsData: [
        'Import Log for Record 01 (Crossfire : a litany for survival : poems 1998-2019 / Staceyann Chin ; foreword by Jacqueline Woodson.)',
        'KU/CC/DI/M',
        'KU/CC/DI/A',
      ],
    };
    const mappingProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C389471 Test multiple holdings${getRandomPostfix()}`,
      permanentLocation: '945$h',
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C389471 Test multiple holdings${getRandomPostfix()}`,
    };
    const jobProfile = {
      profileName: `C389471 Test multiple holdings${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHrid}"`,
        }).then((instance) => {
          instance.holdings.forEach((holding) => cy.deleteHoldingRecordViaApi(holding.id));
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
    });

    it(
      'C389471 Check the JSON screen for imported multiple holdings created from one instance (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillPermanentLocation(mappingProfile.permanentLocation);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfileByName('Default - Create instance');
        NewJobProfile.linkActionProfile(actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.filePathForCreate, testData.marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.marcFileName);
        Logs.checkJobStatus(testData.marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcFileName);
        FileDetails.verifyMultipleHoldingsStatus(
          testData.arrayOfHoldingsStatuses,
          testData.quantityOfCreatedHoldings,
        );
        FileDetails.openJsonScreen(testData.title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openMarcSrsTab();
        JsonScreenView.getInstanceHrid().then((hrid) => {
          testData.instanceHrid = hrid;
          JsonScreenView.openHoldingsTab();
          testData.jsonHoldingsData.forEach((value) => JsonScreenView.verifyContentInTab(value));
        });
      },
    );
  });
});
