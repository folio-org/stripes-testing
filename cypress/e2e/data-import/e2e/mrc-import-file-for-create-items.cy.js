import {
  ACCEPTED_DATA_TYPE_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    let user = {};
    const fileName = `C343334autotestFile.${getRandomPostfix()}.mrc`;

    const collectionOfProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `autotestMappingInstance${getRandomPostfix()}`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `autotestActionInstance${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `autotestMappingHoldings${getRandomPostfix()}`,
          permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `autotestActionHoldings${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `autotestMappingItem${getRandomPostfix()}`,
          materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `autotestActionItem${getRandomPostfix()}`,
        },
      },
    ];

    const specialJobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `autotestJobProf${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('login', () => {
      cy.createTempUser([
        Permissions.dataImportUploadAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password);
      });
    });

    const createInstanceMappingProfile = (instanceMappingProfile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(instanceMappingProfile.name);
    };

    const createHoldingsMappingProfile = (holdingsMappingProfile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(holdingsMappingProfile.permanentLocation);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(holdingsMappingProfile.name);
    };

    const createItemMappingProfile = (itemMappingProfile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
      NewFieldMappingProfile.fillMaterialType(itemMappingProfile.materialType);
      NewFieldMappingProfile.fillPermanentLoanType(itemMappingProfile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(`"${itemMappingProfile.status}"`);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(itemMappingProfile.name);
    };

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        // delete generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(specialJobProfile.profileName);
        collectionOfProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
      });
    });

    it(
      'C343334 MARC file import with creating a new mapping profiles, action profiles and job profile (folijet)',
      { tags: ['smoke', 'folijet', 'nonParallel'] },
      () => {
        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        createInstanceMappingProfile(collectionOfProfiles[0].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[0].mappingProfile.name,
        );
        createHoldingsMappingProfile(collectionOfProfiles[1].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[1].mappingProfile.name,
        );
        createItemMappingProfile(collectionOfProfiles[2].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[2].mappingProfile.name,
        );

        collectionOfProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(specialJobProfile);
        collectionOfProfiles.forEach((profile) => {
          NewJobProfile.linkActionProfile(profile.actionProfile);
        });
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(specialJobProfile.profileName);

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(specialJobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile();
        Logs.checkImportFile(specialJobProfile.profileName);
        Logs.openFileDetails(fileName);
        cy.reload();
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(0, '1');
      },
    );
  });
});
