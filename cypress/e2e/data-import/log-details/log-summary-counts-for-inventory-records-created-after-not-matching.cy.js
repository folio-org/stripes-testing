import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    const marcFileName = `C378901 autotestFile${getRandomPostfix()}.mrc`;
    const barcodes = ['B(UMLLTTEST3)LLTAMGUT8UGUT_-UM', 'B(UMLLTTEST3)LLTAALIVIAUCO_-UM'];
    const firstInstanceTitle =
      '<In lacu> Guillelmus de Sancto Theodorico (dubium) [electronic resource]';
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C378901 instance mapping profile ${getRandomPostfix()}`,
          catalogedDate: '###TODAY###',
          instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C378901 instance action profile ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C378901 holdings mapping profile ${getRandomPostfix()}`,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
          permanentLocationUI: LOCATION_NAMES.ONLINE_UI,
          callNumberType: '852$t',
          callNumber: '852$h',
          relationship: '"Resource"',
          uri: '856$u',
          link: '856$y',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C378901 holdings action profile${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C378901 item mapping profile ${getRandomPostfix()}`,
          barcode: '876$a',
          materialType: '877$m',
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C378901 item action profile${getRandomPostfix()}`,
        },
      },
    ];
    const matchProfile = {
      profileName: `C378901 match profile ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '034',
        in1: '9',
        in2: ' ',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.systemControlNumber,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C378901 job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(barcodes[0]);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(barcodes[1]);
      });
    });

    const createInstanceMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.fillCatalogedDate(profile.catalogedDate);
      NewFieldMappingProfile.fillInstanceStatusTerm();
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };
    const createHoldingsMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.fillPermanentLocation(profile.permanentLocation);
      NewFieldMappingProfile.fillCallNumberType(profile.callNumberType);
      NewFieldMappingProfile.fillCallNumber(profile.callNumber);
      NewFieldMappingProfile.addElectronicAccess(
        profile.typeValue,
        profile.relationship,
        profile.uri,
        profile.link,
      );
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };
    const createItemMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.fillBarcode(profile.barcode);
      NewFieldMappingProfile.fillMaterialType(profile.materialType);
      NewFieldMappingProfile.fillPermanentLoanType(profile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(`"${profile.status}"`);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };

    it(
      'C378901 Check log summary counts for inventory records created after NOT matching (folijet)',
      { tags: ['criticalPath', 'folijet', 'C378901'] },
      () => {
        // create mapping profiles
        createInstanceMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        createHoldingsMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        createItemMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );

        // create action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchAndThreeActionProfiles(
          matchProfile.profileName,
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
          collectionOfMappingAndActionProfiles[2].actionProfile.name,
          1,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload .mrc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.checkIsLandingPageOpened();
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC378901.mrc', marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        // check created counter in the Summary table
        FileDetails.checkItemsQuantityInSummaryTable(0, '2');
        // check Updated counter in the Summary table
        FileDetails.checkItemsQuantityInSummaryTable(1, '0');
        // check No action counter in the Summary table
        FileDetails.checkItemsQuantityInSummaryTable(2, '0');
        // check Error counter in the Summary table
        FileDetails.checkItemsQuantityInSummaryTable(3, '0');

        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InstanceRecordView.verifyInstanceIsOpened(firstInstanceTitle);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        Logs.openFileDetails(marcFileName);
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.CREATED);
        HoldingsRecordView.checkPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocationUI,
        );
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        Logs.openFileDetails(marcFileName);
        FileDetails.openItemInInventory(RECORD_STATUSES.CREATED);
        ItemRecordView.verifyItemStatus(
          collectionOfMappingAndActionProfiles[2].mappingProfile.status,
        );
      },
    );
  });
});
