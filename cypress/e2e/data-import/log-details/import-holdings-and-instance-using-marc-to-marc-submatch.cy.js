import {
  EXISTING_RECORD_NAMES,
  HOLDINGS_TYPE_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Helper from '../../../support/fragments/finance/financeHelper';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NewInstanceStatusType from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/newInstanceStatusType';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const testData = {
      protectedField: '856',
      protectedFieldRule: null,
      fileName: 'marcFileForSubmatch.mrc',
    };
    let user;
    const instanceHrids = [];
    // profiles for create
    const collectionOfMappingAndActionProfilesForCreate = [
      {
        mappingProfile: {
          name: `Create ER Instance ${getRandomPostfix()}`,
          statusTerm: INSTANCE_STATUS_TERM_NAMES.ELECTRONIC_RESOURCE,
        },
        actionProfile: {
          name: `Create ER Instance ${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
        },
      },
      {
        mappingProfile: {
          name: `Create ER Holdings ${getRandomPostfix()}`,
          holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
          // createHoldingsMappingProfileViaApi already wraps this in quotes itself - a pre-quoted
          // value here double-quotes and fails to resolve during import
          permanentLocation: LOCATION_NAMES.ANNEX,
          relationship: '"Resource"',
          uri: '856$u',
          linkText: '856$y',
          materialsSpecified: '856$3',
          urlPublicNote: '856$z',
        },
        actionProfile: {
          name: `Create ER Holdings ${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
        },
      },
    ];
    const jobProfileForCreate = {
      name: `Create ER Instance and Holdings ${getRandomPostfix()}`,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      InstanceStatusTypes.getViaApi({ query: '"name"=="Electronic Resource"' }).then((type) => {
        if (type.length === 0) {
          NewInstanceStatusType.createViaApi().then((initialInstanceStatusType) => {
            testData.instanceStatusTypeId = initialInstanceStatusType.body.id;
          });
        }
      });

      NewFieldMappingProfile.createInstanceStatusTermMappingProfileViaApi(
        collectionOfMappingAndActionProfilesForCreate[0].mappingProfile,
      ).then((mappingProfileResponse) => {
        NewActionProfile.createActionProfileViaApi(
          collectionOfMappingAndActionProfilesForCreate[0].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          collectionOfMappingAndActionProfilesForCreate[0].actionProfileId =
            actionProfileResponse.body.id;
        });
      });

      NewFieldMappingProfile.createHoldingsMappingProfileViaApi(
        collectionOfMappingAndActionProfilesForCreate[1].mappingProfile,
      ).then((mappingProfileResponse) => {
        NewActionProfile.createActionProfileViaApi(
          collectionOfMappingAndActionProfilesForCreate[1].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          collectionOfMappingAndActionProfilesForCreate[1].actionProfileId =
            actionProfileResponse.body.id;
        });
      });

      cy.then(() => {
        NewJobProfile.createJobProfileWithLinkedTwoActionProfilesViaApi(
          jobProfileForCreate,
          collectionOfMappingAndActionProfilesForCreate[0].actionProfileId,
          collectionOfMappingAndActionProfilesForCreate[1].actionProfileId,
        ).then((jobProfileId) => {
          jobProfileForCreate.id = jobProfileId;
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        user = userProperties;
      });
    });

    // Defensively clears every existing 856 protection rule (not just this spec's own, in case a
    // previous run crashed before cleanup) before creating this test's rule - safe only because
    // this spec is tagged nonParallel, so no concurrently-running spec can lose its own rule to this
    beforeEach('Protect 856 field', () => {
      cy.getAdminToken();
      MarcFieldProtection.deleteProtectedFieldsViaApi([testData.protectedField]);
      MarcFieldProtection.createViaApi({
        indicator1: '*',
        indicator2: '*',
        subfield: '*',
        data: '*',
        field: testData.protectedField,
      }).then((resp) => {
        testData.protectedFieldRule = resp;
      });
    });

    beforeEach('Login', () => {
      cy.login(user.username, user.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
    });

    afterEach('Remove 856 protection', () => {
      cy.getAdminToken(false);
      MarcFieldProtection.deleteProtectedFieldsViaApi([testData.protectedField]);
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        InstanceStatusTypes.deleteViaApi(testData.instanceStatusTypeId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.name);
        collectionOfMappingAndActionProfilesForCreate.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        Users.deleteViaApi(user.userId);
        instanceHrids.forEach((hrid) => {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
            (instance) => {
              cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      });
    });

    it(
      'C397983 Verify the ability to import Holdings and Instance using marc-to-marc submatch: 2 matches (promin)',
      { tags: ['criticalPath', 'promin', 'nonParallel', 'C397983'] },
      () => {
        const fileNameForCreate = `C397983 autotestFileForCreate${getRandomPostfix()}.mrc`;
        const fileNameForUpdate = `C397983 autotestFileForUpdate${getRandomPostfix()}.mrc`;
        const editedMarcFileNameForCreate = `C397983 editedAutotestFileForCreate${getRandomPostfix()}.mrc`;
        const editedMarcFileNameForUpdate = `C397983 editedAutotestFileForUpdate${getRandomPostfix()}.mrc`;
        const uniq001Field = Helper.getRandomBarcode();
        const newUri = 'http://jbjjhhjj:3000/Test2';
        const mappingProfileForUpdate = {
          name: `C397983 Override 856 protection ${getRandomPostfix()}`,
        };
        const actionProfileForUpdate = {
          name: `C397983 Update srs override 856 protection ${getRandomPostfix()}`,
          action: 'UPDATE',
          folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
        };
        const matchProfileInstanceStatus = {
          profileName: `C397983 Instance status submatch - Electronic Resource ${getRandomPostfix()}`,
        };
        const matchProfile035 = {
          profileName: `C397983 035$a to 035$a match ${getRandomPostfix()}`,
        };
        const jobProfileForUpdate = {
          profileName: `C397983 035$a to 035$a match with instance status type submatch ${getRandomPostfix()}`,
        };

        // change file for creating uniq 035 field
        DataImport.editMarcFile(
          testData.fileName,
          editedMarcFileNameForCreate,
          ['9000098'],
          [uniq001Field],
        );

        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForCreate, fileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreate.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForCreate);
        Logs.checkJobStatus(fileNameForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });

        // change file for changing content of 856 field
        DataImport.editMarcFile(
          testData.fileName,
          editedMarcFileNameForUpdate,
          ['9000098', 'http://jbjjhhjj:3000/'],
          [uniq001Field, newUri],
        );

        // create profiles for updating via API
        cy.getAdminToken(false);
        NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfileForUpdate, [
          testData.protectedFieldRule,
        ]).then((mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfileForUpdate,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi({
              profileName: matchProfile035.profileName,
              incomingRecordFields: { field: '035', subfield: 'a' },
              existingRecordFields: { field: '035', subfield: 'a' },
              recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            }).then((match035Response) => {
              NewMatchProfile.createMatchProfileWithStaticValueAndExistingMatchExpressionViaApi({
                profileName: matchProfileInstanceStatus.profileName,
                incomingStaticValue: 'Electronic Resource',
                existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
                existingRecordOption: 'instance.statusId',
              }).then((matchStatusResponse) => {
                NewJobProfile.createJobProfileWithLinkedNestedMatchAndActionProfilesViaApi(
                  jobProfileForUpdate.profileName,
                  match035Response.body.id,
                  matchStatusResponse.body.id,
                  actionProfileResponse.body.id,
                ).then((jobProfileId) => {
                  jobProfileForUpdate.id = jobProfileId;
                });
              });
            });
          });
        });
        cy.getToken(user.username, user.password);

        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForUpdate, fileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdate);
        Logs.checkJobStatus(fileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdate);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InventoryInstance.getAssignedHRID().then((hrId) => {
          instanceHrids.push(hrId);
        });
        InstanceRecordView.verifyElectronicAccess(newUri);
        InstanceRecordView.verifyElectronicAccessAbsent(1);
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(testData.protectedField, newUri);

        cy.getAdminToken(false).then(() => {
          // delete profiles
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile035.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(
            matchProfileInstanceStatus.profileName,
          );
          SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileForUpdate.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            mappingProfileForUpdate.name,
          );
        });
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForCreate}`);
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForUpdate}`);
      },
    );

    it(
      'C397984 Verify the ability to import Holdings and Instance using marc-to-marc submatch: 1 match (promin)',
      { tags: ['criticalPath', 'promin', 'nonParallel', 'C397984'] },
      () => {
        const fileNameForCreate = `C397984 autotestFileForCreate${getRandomPostfix()}.mrc`;
        const fileNameForUpdate = `C397984 autotestFileForUpdate${getRandomPostfix()}.mrc`;
        const editedMarcFileNameForCreate = `C397984 editedAutotestFileForCreate${getRandomPostfix()}.mrc`;
        const editedMarcFileNameForUpdate = `C397984 editedAutotestFileForUpdate${getRandomPostfix()}.mrc`;
        const uniq001Field = Helper.getRandomBarcode();
        const newUri = 'http://jbjjhhjj:3000/Test';
        const mappingProfileForUpdate = {
          name: `C397984 Override 856 protection ${getRandomPostfix()}`,
        };
        const actionProfileForUpdate = {
          name: `C397984 Update srs override 856 protection ${getRandomPostfix()}`,
          action: 'UPDATE',
          folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
        };
        const matchProfile = {
          profileName: `C397984 035$a to 035$a match ${getRandomPostfix()}`,
        };
        const jobProfileForUpdate = {
          profileName: `C397984 035$a to 035$a match with instance status type submatch ${getRandomPostfix()}`,
        };

        // change file for creating uniq 035 field
        DataImport.editMarcFile(
          testData.fileName,
          editedMarcFileNameForCreate,
          ['9000098'],
          [uniq001Field],
        );

        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForCreate, fileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreate.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForCreate);
        Logs.checkJobStatus(fileNameForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });

        // change file for changing content of 856 field
        DataImport.editMarcFile(
          testData.fileName,
          editedMarcFileNameForUpdate,
          ['9000098', 'http://jbjjhhjj:3000/'],
          [uniq001Field, newUri],
        );

        // create profiles for updating via API
        cy.getAdminToken(false);
        NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfileForUpdate, [
          testData.protectedFieldRule,
        ]).then((mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfileForUpdate,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi({
              profileName: matchProfile.profileName,
              incomingRecordFields: { field: '035', subfield: 'a' },
              existingRecordFields: { field: '035', subfield: 'a' },
              recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            }).then((matchProfileResponse) => {
              NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                jobProfileForUpdate.profileName,
                matchProfileResponse.body.id,
                actionProfileResponse.body.id,
              ).then((jobProfileId) => {
                jobProfileForUpdate.id = jobProfileId;
              });
            });
          });
        });
        cy.getToken(user.username, user.password);

        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForUpdate, fileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdate);
        Logs.checkJobStatus(fileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InventoryInstance.getAssignedHRID().then((hrId) => {
          instanceHrids.push(hrId);
        });
        InstanceRecordView.verifyElectronicAccess(newUri);
        InstanceRecordView.verifyElectronicAccessAbsent(1);
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(testData.protectedField, newUri);

        cy.getAdminToken(false).then(() => {
          // delete profiles
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileForUpdate.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            mappingProfileForUpdate.name,
          );
        });
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForCreate}`);
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForUpdate}`);
      },
    );

    it(
      'C397383 Verify the ability to import Holdings and Instance using marc-to-marc submatch: 3 matches (promin)',
      { tags: ['smoke', 'promin', 'nonParallel', 'C397383'] },
      () => {
        const fileNameForCreate = `C397383 autotestFileForCreate${getRandomPostfix()}.mrc`;
        const fileNameForUpdate = `C397383 autotestFileForUpdate${getRandomPostfix()}.mrc`;
        const editedMarcFileNameForCreate = `C397383 editedAutotestFileForCreate${getRandomPostfix()}.mrc`;
        const editedMarcFileNameForUpdate = `C397383 editedAutotestFileForUpdate${getRandomPostfix()}.mrc`;
        const uniq001Field = Helper.getRandomBarcode();
        const newUri = 'http://jbjjhhjj:3000/Test3';
        const mappingProfileMarcBib = {
          name: `C397383 Override 856 protection ${getRandomPostfix()}`,
        };
        const actionProfileMarcBib = {
          name: `C397383 Update srs override 856 protection ${getRandomPostfix()}`,
          action: 'UPDATE',
          folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
        };
        const mappingProfileHoldings = {
          name: `C397383 Update ER holdings ${getRandomPostfix()}`,
          holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
          // createHoldingsMappingProfileViaApi already wraps this in quotes itself - a pre-quoted
          // value here double-quotes and fails to resolve during import
          permanentLocation: LOCATION_NAMES.ONLINE,
        };
        const actionProfileHoldings = {
          name: `C397383 Update ER Holdings ${getRandomPostfix()}`,
          action: 'UPDATE',
          folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
        };
        const matchProfile035 = {
          profileName: `C397383 035$a to 035$a match ${getRandomPostfix()}`,
        };
        const matchProfileInstanceStatus = {
          profileName: `C397383 Instance status submatch - Electronic Resource ${getRandomPostfix()}`,
        };
        const matchProfileHoldingsType = {
          profileName: `C397383 Holdings type electronic ${getRandomPostfix()}`,
        };
        const jobProfileForUpdate = {
          profileName: `C397383 035$a to 035$a match with instance status and holdings type submatch ${getRandomPostfix()}`,
        };

        // change file for creating uniq 035 field
        DataImport.editMarcFile(
          testData.fileName,
          editedMarcFileNameForCreate,
          ['9000098'],
          [uniq001Field],
        );

        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForCreate, fileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreate.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForCreate);
        Logs.checkJobStatus(fileNameForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });

        // change file for changing content of 856 field
        DataImport.editMarcFile(
          testData.fileName,
          editedMarcFileNameForUpdate,
          ['9000098', 'http://jbjjhhjj:3000/'],
          [uniq001Field, newUri],
        );

        // create profiles for updating via API
        cy.getAdminToken(false);
        NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfileMarcBib, [
          testData.protectedFieldRule,
        ]).then((marcBibMappingResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfileMarcBib,
            marcBibMappingResponse.body.id,
          ).then((marcBibActionResponse) => {
            NewFieldMappingProfile.createHoldingsMappingProfileViaApi(mappingProfileHoldings).then(
              (holdingsMappingResponse) => {
                NewActionProfile.createActionProfileViaApi(
                  actionProfileHoldings,
                  holdingsMappingResponse.body.id,
                ).then((holdingsActionResponse) => {
                  NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi({
                    profileName: matchProfile035.profileName,
                    incomingRecordFields: { field: '035', subfield: 'a' },
                    existingRecordFields: { field: '035', subfield: 'a' },
                    recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
                  }).then((match035Response) => {
                    NewMatchProfile.createMatchProfileWithStaticValueAndExistingMatchExpressionViaApi(
                      {
                        profileName: matchProfileInstanceStatus.profileName,
                        incomingStaticValue: 'Electronic Resource',
                        existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
                        existingRecordOption: 'instance.statusId',
                      },
                    ).then((matchStatusResponse) => {
                      NewMatchProfile.createMatchProfileWithStaticValueAndExistingMatchExpressionViaApi(
                        {
                          profileName: matchProfileHoldingsType.profileName,
                          incomingStaticValue: 'Electronic',
                          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
                          existingRecordOption: 'holdingsrecord.holdingsTypeId',
                        },
                      ).then((matchHoldingsTypeResponse) => {
                        NewJobProfile.createJobProfileWithLinkedTripleNestedMatchAndTwoActionProfilesViaApi(
                          jobProfileForUpdate.profileName,
                          match035Response.body.id,
                          matchStatusResponse.body.id,
                          matchHoldingsTypeResponse.body.id,
                          marcBibActionResponse.body.id,
                          holdingsActionResponse.body.id,
                        ).then((jobProfileId) => {
                          jobProfileForUpdate.id = jobProfileId;
                        });
                      });
                    });
                  });
                });
              },
            );
          });
        });
        cy.getToken(user.username, user.password);

        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForUpdate, fileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdate);
        Logs.checkJobStatus(fileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InventoryInstance.getAssignedHRID().then((hrId) => {
          instanceHrids.push(hrId);
        });
        InstanceRecordView.verifyElectronicAccess(newUri);
        InstanceRecordView.verifyElectronicAccessAbsent(1);
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(testData.protectedField, newUri);
        InventoryViewSource.close();
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.checkPermanentLocation(LOCATION_NAMES.ONLINE_UI);

        cy.getAdminToken(false).then(() => {
          // delete profiles
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile035.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(
            matchProfileInstanceStatus.profileName,
          );
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(
            matchProfileHoldingsType.profileName,
          );
          SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileMarcBib.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileMarcBib.name);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileHoldings.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            mappingProfileHoldings.name,
          );
        });
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForCreate}`);
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForUpdate}`);
      },
    );
  });
});
