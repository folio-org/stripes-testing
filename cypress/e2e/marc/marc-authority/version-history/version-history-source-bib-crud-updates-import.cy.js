import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  RECORD_STATUSES,
  JOB_STATUS_NAMES,
} from '../../../../support/constants';
import DateTools from '../../../../support/utils/dateTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: 'AT_C692124_MarcBibInstance',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        modifiedMarcFile: 'preUpdatedMarcFileC692124.mrc',
        uploadModifiedMarcFile: `testUpdatedMarcFileC692124_${randomPostfix}.mrc`,
        jobProfileName: `C692124 Update MARC Bib records matching by 010 a ${randomPostfix}`,
        ldrRegExp: /^\d{5}[a-zA-Z]{3}.{1}[a-zA-Z0-9]{8}.{3}4500$/,
      };
      const versionHistoryCardsData = [
        {
          isOriginal: false,
          isCurrent: true,
          changes: [
            { text: 'Field 710', action: VersionHistorySection.fieldActions.ADDED },
            { text: 'Field 650', action: VersionHistorySection.fieldActions.ADDED },
            { text: 'Field 655', action: VersionHistorySection.fieldActions.ADDED },
            { text: 'Field 100', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field 650', action: VersionHistorySection.fieldActions.REMOVED },
            { text: 'Field 655', action: VersionHistorySection.fieldActions.REMOVED },
            { text: 'Field 651', action: VersionHistorySection.fieldActions.REMOVED },
          ],
        },
        { isOriginal: true, isCurrent: false },
      ];
      const changesModalData = [
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '710',
          from: undefined,
          to: '1  $a  Sutherland, John, $d 1983',
        },
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '710',
          from: undefined,
          to: '1  $a  Zhang, Xinci. $d 1992',
        },
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '650',
          from: undefined,
          to: ' 1 $a Female friendship $v Fiction. $v Novel $z without a Hero $v Book',
        },
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '650',
          from: undefined,
          to: '00 $a Social class $v Non-Fiction.',
        },
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '650',
          from: undefined,
          to: '11 $a Married women',
        },
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '655',
          from: undefined,
          to: ' 0 $a England $v Fiction.',
        },
        {
          action: VersionHistorySection.fieldActions.ADDED,
          field: '655',
          from: undefined,
          to: ' 7 $a Satire. $3 lcsh',
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: '100',
          from: '1  $a Thackeray, William Makepeace, $d 1811-1863.',
          to: '2  $a Thackeray, William Makepeace, 1811-1863 years $e Author $e Novelist',
        },
        {
          action: VersionHistorySection.fieldActions.EDITED,
          field: 'LDR',
          from: testData.ldrRegExp,
          to: testData.ldrRegExp,
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '651',
          from: ' 0 $a England $v Fiction.',
          to: undefined,
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '650',
          from: ' 0 $a Social classes $v Fiction.',
          to: undefined,
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '650',
          from: ' 0 $a British $z Europe $v Fiction.',
          to: undefined,
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '650',
          from: ' 0 $a Waterloo, Battle of, Waterloo, Belgium, 1815 $v Fiction.',
          to: undefined,
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '650',
          from: ' 0 $a Female friendship $v Fiction.',
          to: undefined,
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '650',
          from: ' 0 $a Married women $v Fiction.',
          to: undefined,
        },
        {
          action: VersionHistorySection.fieldActions.REMOVED,
          field: '655',
          from: ' 7 $a Satire. $2 lcsh',
          to: undefined,
        },
      ];
      const permissions = [
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ];
      const marcFile = {
        marc: 'marcBibFileC692124.mrc',
        fileName: `testMarcFileC692124_${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      };
      const mappingProfile = {
        name: testData.jobProfileName,
      };
      const actionProfile = {
        name: testData.jobProfileName,
        action: 'UPDATE',
        folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const matchProfile = {
        profileName: testData.jobProfileName,
        incomingRecordFields: {
          field: '010',
          in1: '',
          in2: '',
          subfield: 'a',
        },
        existingRecordFields: {
          field: '010',
          in1: '',
          in2: '',
          subfield: 'a',
        },
        recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const jobProfile = {
        profileName: testData.jobProfileName,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C692124');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getUsers({ limit: 1, query: `"username"="${Cypress.env('diku_login')}"` }).then(
            (users) => {
              testData.adminLastName = users[0].personal.lastName;
              testData.adminFirstName = users[0].personal.firstName;

              versionHistoryCardsData.forEach((cardData, index) => {
                if (index === versionHistoryCardsData.length - 1) {
                  cardData.firstName = testData.adminFirstName;
                  cardData.lastName = testData.adminLastName;
                } else {
                  cardData.firstName = userProperties.firstName;
                  cardData.lastName = userProperties.lastName;
                }
              });
            },
          );

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            testData.createdRecordId = response[0].instance.id;

            // create Field mapping profile
            NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile)
              .then((mappingProfileResponse) => {
                mappingProfile.id = mappingProfileResponse.body.id;
              })
              .then(() => {
                // create Action profile and link it to Field mapping profile
                NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
                  (actionProfileResponse) => {
                    actionProfile.id = actionProfileResponse.body.id;
                  },
                );
              })
              .then(() => {
                // create Match profile
                NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                  matchProfile,
                ).then((matchProfileResponse) => {
                  matchProfile.id = matchProfileResponse.body.id;
                });
              })
              .then(() => {
                // create Job profile
                NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                  jobProfile.profileName,
                  matchProfile.id,
                  actionProfile.id,
                );

                cy.waitForAuthRefresh(() => {
                  cy.login(testData.userProperties.username, testData.userProperties.password);
                  TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
                  DataImport.waitLoading();
                  cy.reload();
                  DataImport.waitLoading();
                }, 20_000);
              });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });

      it(
        'C692124 Check "Version history" pane after CRUD fields, subfields, indicators in MARC bib record updated via "Data import" app (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C692124'] },
        () => {
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(testData.modifiedMarcFile, testData.uploadModifiedMarcFile);
          JobProfiles.waitLoadingList();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(testData.uploadModifiedMarcFile);
          Logs.checkJobStatus(testData.uploadModifiedMarcFile, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(testData.uploadModifiedMarcFile);
          Logs.verifyInstanceStatus(0, 3, RECORD_STATUSES.UPDATED);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.createdRecordId);
          InventoryInstances.selectInstanceById(testData.createdRecordId);
          InventoryInstance.checkInstanceTitle(testData.instanceTitle);

          InventoryInstance.viewSource();
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(versionHistoryCardsData.length);
          versionHistoryCardsData.forEach((cardData, index) => {
            VersionHistorySection.verifyVersionHistoryCard(
              index,
              testData.date,
              cardData.firstName,
              cardData.lastName,
              cardData.isOriginal,
              cardData.isCurrent,
            );
            if (cardData.changes) {
              cardData.changes.forEach((change) => {
                VersionHistorySection.checkChangeForCard(index, change.text, change.action);
              });
              VersionHistorySection.checkChangesCountForCard(index, cardData.changes.length);
            }
          });

          VersionHistorySection.openChangesForCard();
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );
          changesModalData.forEach((change) => {
            VersionHistorySection.checkChangeInModal(...Object.values(change));
          });
          VersionHistorySection.checkChangesCountInModal(changesModalData.length);
        },
      );
    });
  });
});
