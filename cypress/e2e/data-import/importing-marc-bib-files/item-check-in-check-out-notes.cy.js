import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
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
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let collectionOfProfiles;
    let jobProfile;
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomNDigitNumber(7);
    const randomBarcode = `c17034${randomDigits}`;
    const marcFileName = `C17034_autotestFile${randomPostfix}.mrc`;
    const checkInNoteText = 'AT_C17034 check in note';
    const checkOutNoteText = 'AT_C17034 check out note';

    before('Create test user and edit MARC file', () => {
      DataImport.editMarcFile(
        'marcBibFileForC17034.mrc',
        marcFileName,
        ['DIGITS', 'BARCODE'],
        [randomDigits, randomBarcode],
      );

      cy.getAdminToken();
      cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((materialType) => {
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((location) => {
            collectionOfProfiles = [
              {
                mappingProfile: {
                  typeValue: FOLIO_RECORD_TYPE.INSTANCE,
                  name: `AT_C17034_InstanceMappingProfile_${randomPostfix}`,
                  catalogingDate: '###TODAY###',
                },
                actionProfile: {
                  typeValue: FOLIO_RECORD_TYPE.INSTANCE,
                  name: `AT_C17034_InstanceActionProfile_${randomPostfix}`,
                },
              },
              {
                mappingProfile: {
                  typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
                  name: `AT_C17034_HoldingsMappingProfile_${randomPostfix}`,
                  permanetLocation: `"${location.name} (${location.code})"`,
                },
                actionProfile: {
                  typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
                  name: `AT_C17034_HoldingsActionProfile_${randomPostfix}`,
                },
              },
              {
                mappingProfile: {
                  typeValue: FOLIO_RECORD_TYPE.ITEM,
                  name: `AT_C17034_ItemMappingProfile_${randomPostfix}`,
                  materialType: `"${materialType.name}"`,
                  barcode: '945$a',
                  checkInNoteType: '"Check in note"',
                  checkInNote: `"${checkInNoteText}"`,
                  checkOutNoteType: '"Check out note"',
                  checkOutNote: `"${checkOutNoteText}"`,
                  staffOnly: 'Mark for all affected records',
                  permanentLoanType: loanTypes[0].name,
                  status: ITEM_STATUS_NAMES.AVAILABLE,
                },
                actionProfile: {
                  typeValue: FOLIO_RECORD_TYPE.ITEM,
                  name: `AT_C17034_ItemActionProfile_${randomPostfix}`,
                },
              },
            ];

            jobProfile = {
              ...NewJobProfile.defaultJobProfile,
              profileName: `AT_C17034_JobProfile_${randomPostfix}`,
              acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
            };
          });
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        FileManager.deleteFile(`cypress/fixtures/${marcFileName}`);
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        collectionOfProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C17034_');
      });
    });

    it(
      'C17034 Test Item record check-in/check-out notes (promin)',
      { tags: ['edgeCases', 'promin', 'C17034'] },
      () => {
        // Step 1: Create item field mapping profile with barcode and check-in/check-out notes
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfiles[2].mappingProfile);
        NewFieldMappingProfile.fillMaterialType(
          collectionOfProfiles[2].mappingProfile.materialType,
        );
        NewFieldMappingProfile.fillBarcode(collectionOfProfiles[2].mappingProfile.barcode);
        NewFieldMappingProfile.addCheckInCheckOutNote(
          collectionOfProfiles[2].mappingProfile.checkInNoteType,
          collectionOfProfiles[2].mappingProfile.checkInNote,
          collectionOfProfiles[2].mappingProfile.staffOnly,
        );
        NewFieldMappingProfile.addNextCheckInCheckOutNote(
          collectionOfProfiles[2].mappingProfile.checkOutNoteType,
          collectionOfProfiles[2].mappingProfile.checkOutNote,
          collectionOfProfiles[2].mappingProfile.staffOnly,
          1,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfProfiles[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(`"${collectionOfProfiles[2].mappingProfile.status}"`);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfiles[2].mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[2].mappingProfile.name,
        );

        // Step 2: Create holdings field mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfiles[1].mappingProfile);
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfProfiles[1].mappingProfile.permanetLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfiles[1].mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[1].mappingProfile.name,
        );

        // Step 3: Create instance field mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfiles[0].mappingProfile);
        NewFieldMappingProfile.fillCatalogedDate(
          collectionOfProfiles[0].mappingProfile.catalogingDate,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfiles[0].mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[0].mappingProfile.name,
        );

        // Step 4: Create action profiles for instance, holdings, and item
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // Step 5: Create job profile and link action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(collectionOfProfiles[0].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfProfiles[1].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfProfiles[2].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // Step 6: Upload edited MARC file and run import
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFileName, marcFileName);
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
        FileDetails.checkItemsQuantityInSummaryTable(0, '1');

        // Step 7: Open imported item and verify barcode, check-in and check-out notes
        FileDetails.openItemInInventory(RECORD_STATUSES.CREATED);
        ItemRecordView.checkBarcode(randomBarcode);
        ItemRecordView.checkCheckInNote(checkInNoteText);
        ItemRecordView.checkCheckOutNote(checkOutNoteText);
      },
    );
  });
});
