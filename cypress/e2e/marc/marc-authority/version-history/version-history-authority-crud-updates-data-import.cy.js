import {
  APPLICATION_NAMES,
  DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(8);

      const authorityHeading = `AT_C663338_MarcAuthority_${randomPostfix}`;
      const naturalId = `n${randomDigits}663338`;
      const authorityUUIDsFileName = `AT_C663338_authorityUUIDs_${randomPostfix}.csv`;
      const ldrRegExp = /^\d{5}[a-zA-Z]{2}.{2}[a-zA-Z0-9]{9}.{2}4500$/;

      const jobProfileName = `AT_C663338 Update MARC authority records by matching 010 $a ${randomPostfix}`;
      const mappingProfile = { name: jobProfileName };
      const actionProfile = {
        name: jobProfileName,
        action: 'UPDATE',
        folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      };
      const matchProfile = {
        profileName: jobProfileName,
        incomingRecordFields: { field: '010', in1: '', in2: '', subfield: 'a' },
        existingRecordFields: { field: '010', in1: '', in2: '', subfield: 'a' },
        recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      };
      const jobProfile = { profileName: jobProfileName };

      const authorityFields = [
        { tag: '010', content: `$a ${naturalId}`, indicators: ['\\', '\\'] },
        { tag: '040', content: '$a DLC $b eng', indicators: ['\\', '\\'] },
        { tag: '100', content: `$a ${authorityHeading}`, indicators: ['1', '\\'] },
        { tag: '670', content: '$a Source one', indicators: ['\\', '\\'] },
        { tag: '670', content: '$a Source two', indicators: ['\\', '\\'] },
        { tag: '953', content: '$a lh45', indicators: ['\\', '\\'] },
      ];

      // Renders a field spec the same way "Changed from/to" text is displayed: indicators
      // (blank -> single space) followed by a separator space, then the raw "$a foo $b bar" content
      const fieldDisplay = ({ indicators, content }) => {
        const indicatorChar = (indicator) => (indicator === '\\' ? ' ' : indicator);
        return `${indicatorChar(indicators[0])}${indicatorChar(indicators[1])} ${content}`;
      };

      const update1 = {
        added950: { tag: '950', indicators: ['\\', '\\'], content: '$a lh45' },
        addedVariant1: {
          tag: '400',
          indicators: ['1', '\\'],
          content: `$a ${authorityHeading} Variant One`,
        },
        addedVariant2: {
          tag: '400',
          indicators: ['1', '\\'],
          content: `$a ${authorityHeading} Variant Two`,
        },
        editedField100: {
          tag: '100',
          indicators: ['1', '\\'],
          content: `$a ${authorityHeading} Updated`,
        },
        editedField040: { tag: '040', indicators: ['\\', '\\'], content: '$a DLC $b eng $c DLC' },
      };

      const update2 = {
        addedVariant1: {
          tag: '400',
          indicators: ['1', '\\'],
          content: `$a ${authorityHeading} Variant One - repeatable field test 1`,
        },
        addedVariant2: {
          tag: '400',
          indicators: ['1', '\\'],
          content: `$a ${authorityHeading} Variant Two - repeatable field test 2`,
        },
      };

      const originalField100 = {
        tag: '100',
        indicators: ['1', '\\'],
        content: `$a ${authorityHeading}`,
      };
      const originalField040 = { tag: '040', indicators: ['\\', '\\'], content: '$a DLC $b eng' };
      const originalField670First = {
        tag: '670',
        indicators: ['\\', '\\'],
        content: '$a Source one',
      };
      const originalField670Second = {
        tag: '670',
        indicators: ['\\', '\\'],
        content: '$a Source two',
      };
      const originalField953 = { tag: '953', indicators: ['\\', '\\'], content: '$a lh45' };

      const update1ChangesModal = [
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '950',
          from: undefined,
          to: fieldDisplay(update1.added950),
        },
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '400',
          from: undefined,
          to: fieldDisplay(update1.addedVariant1),
        },
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '400',
          from: undefined,
          to: fieldDisplay(update1.addedVariant2),
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: '100',
          from: fieldDisplay(originalField100),
          to: fieldDisplay(update1.editedField100),
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: '040',
          from: fieldDisplay(originalField040),
          to: fieldDisplay(update1.editedField040),
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: 'LDR',
          from: ldrRegExp,
          to: ldrRegExp,
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '670',
          from: fieldDisplay(originalField670First),
          to: undefined,
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '670',
          from: fieldDisplay(originalField670Second),
          to: undefined,
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '953',
          from: fieldDisplay(originalField953),
          to: undefined,
        },
      ];

      const update1Bullets = [
        { text: 'Field 950', action: VersionHistorySection.fieldActions.ADDED },
        { text: 'Field 400', action: VersionHistorySection.fieldActions.ADDED },
        { text: 'Field 100', action: VersionHistorySection.fieldActions.EDITED },
        { text: 'Field 040', action: VersionHistorySection.fieldActions.EDITED },
        { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
        { text: 'Field 670', action: VersionHistorySection.fieldActions.REMOVED },
        { text: 'Field 953', action: VersionHistorySection.fieldActions.REMOVED },
      ];

      const update2ChangesModal = [
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '400',
          from: fieldDisplay(update1.addedVariant1),
          to: undefined,
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '400',
          from: fieldDisplay(update1.addedVariant2),
          to: undefined,
        },
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '400',
          from: undefined,
          to: fieldDisplay(update2.addedVariant1),
        },
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '400',
          from: undefined,
          to: fieldDisplay(update2.addedVariant2),
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: 'LDR',
          from: ldrRegExp,
          to: ldrRegExp,
        },
      ];

      const update2Bullets = [
        { text: 'Field 400', action: VersionHistorySection.fieldActions.ADDED },
        { text: 'Field 400', action: VersionHistorySection.fieldActions.REMOVED },
        { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
      ];

      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.moduleDataImportEnabled.gui,
      ];

      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const testData = {};
      let user;
      let authorityId;
      let exportedFileName1;
      let editedFileName1;
      let uploadFileName1;
      let exportedFileName2;
      let editedFileName2;
      let uploadFileName2;

      before('Create test data, job profiles, login', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C663338_MarcAuthority');

        cy.getAdminUserDetails().then((admin) => {
          testData.adminFirstName = admin.personal.firstName;
          testData.adminLastName = admin.personal.lastName;
        });

        cy.createTempUser(permissions).then((userProperties) => {
          user = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            getRandomLetters(15),
            '1',
            authorityFields,
          ).then((id) => {
            authorityId = id;
          });

          cy.then(() => {
            NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
              .then((fmpResponse) => {
                mappingProfile.id = fmpResponse.body.id;
                return NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id);
              })
              .then((apResponse) => {
                actionProfile.id = apResponse.body.id;
                return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                  matchProfile,
                );
              })
              .then((mpResponse) => {
                matchProfile.id = mpResponse.body.id;
                NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                  jobProfile.profileName,
                  matchProfile.id,
                  actionProfile.id,
                );
              });
          });

          cy.then(() => {
            FileManager.createFile(`cypress/fixtures/${authorityUUIDsFileName}`, authorityId);
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
        FileManager.deleteFile(`cypress/fixtures/${authorityUUIDsFileName}`);
        if (editedFileName1) FileManager.deleteFile(`cypress/fixtures/${editedFileName1}`);
        if (editedFileName2) FileManager.deleteFile(`cypress/fixtures/${editedFileName2}`);
        if (exportedFileName1) {
          // downloadExportedMarcFile writes the export to both cypress/downloads and
          // cypress/fixtures - both copies need cleaning up
          FileManager.deleteFileFromDownloadsByMask(exportedFileName1);
          FileManager.deleteFile(`cypress/fixtures/${exportedFileName1}`);
        }
        if (exportedFileName2) {
          FileManager.deleteFileFromDownloadsByMask(exportedFileName2);
          FileManager.deleteFile(`cypress/fixtures/${exportedFileName2}`);
        }
      });

      it(
        'C663338 Check "Version history" pane after CRUD fields, subfields, indicators in "MARC authority" record updated via "Data import" app (promin)',
        { tags: ['extendedPath', 'promin', 'C663338'] },
        () => {
          // ---- Prepare and run update 1 entirely via API ----
          cy.getAdminToken(false);
          ExportFile.exportFileViaApi(
            authorityUUIDsFileName,
            'authority',
            DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
          );
          exportedFileName1 = `AT_C663338_export1_${randomPostfix}.mrc`;
          ExportFile.downloadExportedMarcFile(exportedFileName1);
          editedFileName1 = `AT_C663338_edited1_${randomPostfix}.mrc`;

          cy.then(() => {
            DataImport.editMarcFieldsInAllRecords(exportedFileName1, editedFileName1, {
              addFields: [update1.added950, update1.addedVariant1, update1.addedVariant2],
              removeTags: ['670', '953'],
              editFields: [update1.editedField100, update1.editedField040],
            });
          });

          uploadFileName1 = `AT_C663338_import1_${randomPostfix}.mrc`;
          cy.getToken(user.username, user.password);
          DataImport.uploadFileViaApi(editedFileName1, uploadFileName1, jobProfile.profileName);

          // Steps 1-2: Verify the import completed and SRS MARC/Authority columns show "Updated"
          cy.login(user.username, user.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
          Logs.waitFileIsImported(uploadFileName1);
          Logs.checkJobStatus(uploadFileName1, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(uploadFileName1);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.srsMarc,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.authority,
          );

          // Step 3: Open the updated MARC authority record via the "Updated" hyperlink
          FileDetails.openAuthority(RECORD_STATUSES.UPDATED);
          MarcAuthority.waitLoading();

          // Step 4: Open "Version history" - verify counter and first card's "Changed" bullets
          MarcAuthority.verifyVersionHistoryButtonShown();
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(2);
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            date,
            user.firstName,
            user.lastName,
            false,
            true,
          );
          update1Bullets.forEach((change) => {
            VersionHistorySection.checkChangeForCard(0, change.text, change.action);
          });
          VersionHistorySection.verifyVersionHistoryCard(
            1,
            date,
            testData.adminFirstName,
            testData.adminLastName,
            true,
            false,
          );

          // Step 5: Open the "Changed" modal and verify every field-level change
          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal(date, user.firstName, user.lastName);
          update1ChangesModal.forEach((change) => {
            VersionHistorySection.checkChangeInModal(...Object.values(change));
          });
          VersionHistorySection.checkChangesCountInModal(update1ChangesModal.length);

          // Step 6: Close the modal and go back to the Data Import landing page
          VersionHistorySection.closeChangesModal();
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.waitLoading();

          // ---- Prepare and run update 2 entirely via API ----
          cy.getAdminToken(false);
          ExportFile.exportFileViaApi(
            authorityUUIDsFileName,
            'authority',
            DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.AUTHORITY,
          );
          exportedFileName2 = `AT_C663338_export2_${randomPostfix}.mrc`;
          ExportFile.downloadExportedMarcFile(exportedFileName2);
          editedFileName2 = `AT_C663338_edited2_${randomPostfix}.mrc`;

          cy.then(() => {
            DataImport.editMarcFieldsInAllRecords(exportedFileName2, editedFileName2, {
              addFields: [update2.addedVariant1, update2.addedVariant2],
              removeTags: ['400'],
            });
          });

          uploadFileName2 = `AT_C663338_import2_${randomPostfix}.mrc`;
          cy.getToken(user.username, user.password);
          DataImport.uploadFileViaApi(editedFileName2, uploadFileName2, jobProfile.profileName);

          // Steps 7-8: Verify the second import completed and columns show "Updated"
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.waitLoading();
          Logs.waitFileIsImported(uploadFileName2);
          Logs.checkJobStatus(uploadFileName2, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(uploadFileName2);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.srsMarc,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.authority,
          );

          // Step 9: Open the updated MARC authority record via the "Updated" hyperlink
          FileDetails.openAuthority(RECORD_STATUSES.UPDATED);
          MarcAuthority.waitLoading();

          // Step 10: Open "Version history" - verify counter and first card's "Changed" bullets
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(3);
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            date,
            user.firstName,
            user.lastName,
            false,
            true,
          );
          update2Bullets.forEach((change) => {
            VersionHistorySection.checkChangeForCard(0, change.text, change.action);
          });

          // Step 11: Open the "Changed" modal and verify every field-level change
          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal(date, user.firstName, user.lastName);
          update2ChangesModal.forEach((change) => {
            VersionHistorySection.checkChangeInModal(...Object.values(change));
          });
          VersionHistorySection.checkChangesCountInModal(update2ChangesModal.length);
        },
      );
    });
  });
});
