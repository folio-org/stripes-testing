import {
  APPLICATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Helper from '../../../support/fragments/finance/financeHelper';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
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
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    let userId;
    const marcFileName = `C11105 autotestFile${getRandomPostfix()}.mrc`;
    const filePathForUpload = 'marcBibFileForC11105.mrc';
    const title = "101 things I wish I'd known when I started using hypnosis";
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          name: `C11105 autotest instance mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          suppressFromDiscavery: 'Mark for all affected records',
          staffSuppress: 'Mark for all affected records',
          previouslyHeld: 'Mark for all affected records',
          catalogedDate: '###TODAY###',
          instanceStatus: INSTANCE_STATUS_TERM_NAMES.OTHER,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          statisticalCodeUI: 'Book, print (books)',
          natureOfContent: 'bibliography',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C11105 autotest instance action profile_${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C11105 holdingsMappingProf${getRandomPostfix()}`,
          statisticalCode: 'ARL (Collection stats): emusic - Music scores, electronic',
          statisticalCodeUI: 'Music scores, electronic',
          adminNotes: `autotest administrative holdings note ${getRandomPostfix()}`,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
          permanentLocationUI: LOCATION_NAMES.ONLINE_UI,
          temporaryLocation: `"${LOCATION_NAMES.ANNEX}"`,
          temporaryLocationUI: LOCATION_NAMES.ANNEX_UI,
          formerHoldingsId: `autotestFormerHoldingsId.${getRandomPostfix()}`,
          callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
          callNumber: Helper.getRandomBarcode(),
          holdingsStatements: `autotestHoldingsStatements.${getRandomPostfix()}`,
          illPolicy: 'Unknown lending policy',
          noteType: '"Binding"',
          holdingsNote: `autotestHoldingsNote.${getRandomPostfix()}`,
          staffOnly: 'Mark for all affected records',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C11105 autotest holdings action profile_${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfileForCreate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C11105 autotest job profile_${getRandomPostfix()}`,
    };

    before('Login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.enableStaffSuppressFacet.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C11105 Action and field mapping: Create an instance and holdings (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C11105'] },
      () => {
        // create mapping profiles
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.addStaffSuppress(
          collectionOfMappingAndActionProfiles[0].mappingProfile.staffSuppress,
        );
        NewFieldMappingProfile.addSuppressFromDiscovery(
          collectionOfMappingAndActionProfiles[0].mappingProfile.suppressFromDiscavery,
        );
        NewFieldMappingProfile.addPreviouslyHeld(
          collectionOfMappingAndActionProfiles[0].mappingProfile.previouslyHeld,
        );
        NewFieldMappingProfile.fillCatalogedDate(
          collectionOfMappingAndActionProfiles[0].mappingProfile.catalogedDate,
        );
        NewFieldMappingProfile.fillInstanceStatusTerm(
          collectionOfMappingAndActionProfiles[0].mappingProfile.instanceStatus,
        );
        NewFieldMappingProfile.addStatisticalCode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.statisticalCode,
          8,
        );
        NewFieldMappingProfile.addNatureOfContentTerms(
          `"${collectionOfMappingAndActionProfiles[0].mappingProfile.natureOfContent}"`,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.addFormerHoldings(
          collectionOfMappingAndActionProfiles[1].mappingProfile.formerHoldingsId,
        );
        NewFieldMappingProfile.addStatisticalCode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.statisticalCode,
          4,
        );
        NewFieldMappingProfile.addAdministrativeNote(
          collectionOfMappingAndActionProfiles[1].mappingProfile.adminNotes,
          5,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.fillTemporaryLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.temporaryLocation,
        );
        NewFieldMappingProfile.fillCallNumberType(
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.callNumberType}"`,
        );
        NewFieldMappingProfile.fillCallNumber(
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.callNumber}"`,
        );
        NewFieldMappingProfile.addHoldingsStatements(
          collectionOfMappingAndActionProfiles[1].mappingProfile.holdingsStatements,
        );
        NewFieldMappingProfile.fillIllPolicy(
          collectionOfMappingAndActionProfiles[1].mappingProfile.illPolicy,
        );
        NewFieldMappingProfile.addHoldingsNotes(
          collectionOfMappingAndActionProfiles[1].mappingProfile.noteType,
          collectionOfMappingAndActionProfiles[1].mappingProfile.holdingsNote,
          collectionOfMappingAndActionProfiles[1].mappingProfile.staffOnly,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(
          collectionOfMappingAndActionProfiles[0].actionProfile,
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        SettingsActionProfiles.checkActionProfilePresented(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        SettingsActionProfiles.create(
          collectionOfMappingAndActionProfiles[1].actionProfile,
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        SettingsActionProfiles.checkActionProfilePresented(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        );

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfileForCreate);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

        // upload a marc file for creating
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openMarcSrsTab();
        JsonScreenView.getInstanceHrid().then((hrid) => {
          instanceHrid = hrid;

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.selectYesfilterStaffSuppress();
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkFormerHoldingsId(
            collectionOfMappingAndActionProfiles[1].mappingProfile.formerHoldingsId,
          );
          HoldingsRecordView.checkStatisticalCode(
            collectionOfMappingAndActionProfiles[1].mappingProfile.statisticalCodeUI,
          );
          HoldingsRecordView.checkAdministrativeNote(
            collectionOfMappingAndActionProfiles[1].mappingProfile.adminNotes,
          );
          HoldingsRecordView.checkCallNumberType(
            collectionOfMappingAndActionProfiles[1].mappingProfile.callNumberType,
          );
          HoldingsRecordView.checkCallNumber(
            collectionOfMappingAndActionProfiles[1].mappingProfile.callNumber,
          );
          HoldingsRecordView.checkHoldingsStatement(
            collectionOfMappingAndActionProfiles[1].mappingProfile.holdingsStatements,
          );
          HoldingsRecordView.checkIllPolicy(
            collectionOfMappingAndActionProfiles[1].mappingProfile.illPolicy,
          );
        });
      },
    );
  });
});
