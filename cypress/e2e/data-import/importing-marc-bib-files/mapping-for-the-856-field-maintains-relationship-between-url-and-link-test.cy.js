import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NewInstanceStatusType from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/newInstanceStatusType';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const testData = {
      protectedFieldId: null,
      filePath: 'marcFileForC400649.mrc',
      fileName: `C400649 autotestFile${getRandomPostfix()}.mrc`,
    };
    const firstField = {
      fieldNimberInFile: 0,
      url: 'https://muse.jhu.edu/book/67428',
      linkText: 'Project Muse',
    };
    const secondField = {
      fieldNimberInFile: 1,
      url: 'https://muse.jhu.edu/book/74528',
      linkText: 'Project Muse',
    };
    const thirdField = {
      fieldNimberInFile: 2,
      url: 'https://www.jstor.org/stable/10.2307/j.ctv26d9pv',
      linkText: 'JSTOR',
    };
    const forthField = {
      fieldNimberInFile: 3,
      url: 'https://www.jstor.org/stable/10.2307/j.ctvcwp01n',
      linkText: 'JSTOR',
    };
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C400649 Create ER Instance ${getRandomPostfix()}`,
          instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.ELECTRONIC_RESOURCE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C400649 Create ER Instance ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C400649 Create ER Holdings ${getRandomPostfix()}`,
          holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
          permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
          relationship: '"Resource"',
          uri: '856$u',
          linkText: '856$y',
          materialsSpecified: '856$3',
          urlPublicNote: '856$z',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C400649 Create ER Holdings ${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C400649 Create ER Instance and Holdings ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InstanceStatusTypes.getViaApi({ query: '"name"=="Electronic Resource"' }).then((type) => {
          if (type.length === 0) {
            NewInstanceStatusType.createViaApi().then((initialInstanceStatusType) => {
              testData.instanceStatusTypeId = initialInstanceStatusType.body.id;
            });
          }
        });

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InstanceStatusTypes.getViaApi({ query: '"name"=="Electronic Resource"' }).then((type) => {
          if (type.length !== 0) {
            InstanceStatusTypes.deleteViaApi(type[0].id);
          }
        });
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C400649 Verify that mapping for the 856 field maintains relationship between URL and link text (folijet)',
      { tags: ['criticalPath', 'folijet', 'C400649', 'shiftLeft'] },
      () => {
        // create Field mapping profiles
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.fillInstanceStatusTerm(
          collectionOfMappingAndActionProfiles[0].mappingProfile.instanceStatusTerm,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.fillHoldingsType(
          collectionOfMappingAndActionProfiles[1].mappingProfile.holdingsType,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.addElectronicAccess(
          collectionOfMappingAndActionProfiles[1].mappingProfile.typeValue,
          collectionOfMappingAndActionProfiles[1].mappingProfile.relationship,
          collectionOfMappingAndActionProfiles[1].mappingProfile.uri,
          collectionOfMappingAndActionProfiles[1].mappingProfile.linkText,
          collectionOfMappingAndActionProfiles[1].mappingProfile.materialsSpecified,
          collectionOfMappingAndActionProfiles[1].mappingProfile.urlPublicNote,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfileByName(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        NewJobProfile.linkActionProfileByName(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.filePath, testData.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.fileName);
        Logs.checkJobStatus(testData.fileName, JOB_STATUS_NAMES.COMPLETED);
        cy.wait(3000);
        Logs.openFileDetails(testData.fileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((hrId) => {
          instanceHrid = hrId;
        });
        [firstField, secondField, thirdField, forthField].forEach((field) => {
          InstanceRecordView.verifyElectronicAccess(
            field.url,
            field.linkText,
            field.fieldNimberInFile,
          );
        });
        InstanceRecordView.viewSource();
        cy.wrap([firstField, secondField, thirdField, forthField]).each((field) => {
          InventoryViewSource.verifyFieldInMARCBibSource('856', field.url);
          InventoryViewSource.contains(field.linkText);
        });
      },
    );
  });
});
