import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomNDigitNumber(15);
    const tag008 = '008';

    const authorityHeading = `AT_C397993_MarcAuthority_${randomPostfix}`;
    const naturalId = `${randomDigits}397993`;

    const csvFile = `AT_C397993_authorityUUIDs_${randomPostfix}.csv`;
    const exportedMarcFile = `AT_C397993_exportedMarcFile_${randomPostfix}.mrc`;
    const editedMarcFile = `AT_C397993_editedMarcFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C397993_MappingProfile_${randomPostfix}` };
    const actionProfile = {
      name: `AT_C397993_ActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C397993_MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C397993 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    // "008" is added automatically by createMarcAuthorityViaAPI - it's removed by the reimport
    const marcAuthFields = [
      { tag: '100', content: `$a ${authorityHeading}`, indicators: ['1', '\\'] },
    ];

    function checkValid008ValuesSet() {
      MarcAuthority.defaultAuthority.tag008AuthorityBytesProperties
        .getAllProperties()
        .forEach((property) => {
          cy.expect(property.interactor.has({ checkedOptionText: property.defaultValue }));
        });
    }

    let user;
    let authorityId;

    before('Create test data, job profiles, login', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C397993_');

      cy.then(() => {
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile).then(
          (mappingProfileResponse) => {
            mappingProfile.id = mappingProfileResponse.body.id;
          },
        );
      })
        .then(() => {
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
            (actionProfileResponse) => {
              actionProfile.id = actionProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile).then(
            (matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            jobProfile.profileName,
            matchProfile.id,
            actionProfile.id,
          );
        })
        .then(() => {
          MarcAuthorities.createMarcAuthorityViaAPI(naturalId, '', marcAuthFields).then((id) => {
            authorityId = id;
          });
        })
        .then(() => {
          FileManager.createFile(`cypress/fixtures/${csvFile}`, authorityId);
        })
        .then(() => {
          ExportFile.exportFileViaApi(
            csvFile,
            'authority',
            'Default authority export job profile',
          ).then(() => {
            ExportFile.downloadExportedMarcFile(exportedMarcFile);
          });
        })
        .then(() => {
          cy.readFile(`cypress/downloads/${exportedMarcFile}`, 'binary').then((content) => {
            cy.writeFile(`cypress/fixtures/${exportedMarcFile}`, content, 'binary');
          });
        })
        .then(() => {
          // Remove the "008" field - the field-length change requires the marcjs-based
          // editor, not the plain text-replace one
          DataImport.editMarcFieldsInAllRecords(exportedMarcFile, editedMarcFile, {
            removeTags: ['008'],
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]).then((userProperties) => {
            user = userProperties;

            // Steps 8-9: import the edited file via the Update job profile
            cy.getToken(user.username, user.password);
            DataImport.uploadFileViaApi(editedMarcFile, editedMarcFile, jobProfile.profileName);

            cy.login(user.username, user.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user?.userId);
      if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      FileManager.deleteFile(`cypress/fixtures/${csvFile}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFile}`);
      FileManager.deleteFile(`cypress/downloads/${exportedMarcFile}`);
    });

    it(
      'C397993 Remove "008" field from "MARC Authority" record via Data Import and then add new "008" in UI (promin)',
      { tags: ['extendedPath', 'promin', 'C397993'] },
      () => {
        // Step 10: Data Import Logs - open the completed job; "Updated" shown for SRS MARC/Authority
        Logs.waitFileIsImported(editedMarcFile);
        Logs.checkJobStatus(editedMarcFile, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(editedMarcFile);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });

        // Step 11: click "Updated" link in the Authority column - detail view opens, "008" absent
        FileDetails.openAuthority(RECORD_STATUSES.UPDATED);
        MarcAuthority.waitLoading();

        // Step 12: open editor - "008" is still not shown
        MarcAuthority.edit();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkTagAbsent(tag008);

        // Step 13: add a new "008" field
        QuickMarcEditor.addNewField(tag008, '', 3);
        QuickMarcEditor.checkFieldsExist([tag008]);
        MarcAuthority.setValid008DropdownValues();

        // Step 14: Save & close
        QuickMarcEditor.pressSaveAndClose();
        MarcAuthority.waitLoading();

        // Steps 16-17: reopen editor - "008" boxes are filled with values; "Date Ent" equals today
        cy.intercept('/records-editor/records**').as('recordLoaded');
        MarcAuthority.edit();
        QuickMarcEditor.waitLoading();
        checkValid008ValuesSet();
        cy.wait('@recordLoaded').then(({ response }) => {
          const targetField = response.body.fields.find((field) => field.tag === tag008);
          expect(targetField.content['Date Ent']).to.eq(DateTools.getCurrentDateYYMMDD());
        });
      },
    );
  });
});
