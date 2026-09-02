import {
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INCOMING_RECORD_NAMES,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {};
    const randomPostfix = getRandomPostfix();
    const marcBibFileName = 'marcBibFileForC410938.mrc';
    const firstImportFileName = `AT_C410938_marcBibFileFirst_${randomPostfix}.mrc`;
    const secondImportFileName = `AT_C410938_marcBibFileSecond_${randomPostfix}.mrc`;
    const csvFileName = `AT_C410938_exportList_${randomPostfix}.csv`;
    const exportedMarcFileName = `AT_C410938_exportedMarc_${randomPostfix}.mrc`;

    const instanceTitle1 = 'AT_C410938_MarcBibInstance_1';
    const instanceTitle2 = 'AT_C410938_MarcBibInstance_2';
    const checkOutNoteText = 'This is a checkout note.';
    const checkInNoteText = 'This is a check in note.';
    const updatedCheckOutNoteText = `AT_C410938_cout_${randomPostfix}`;
    const updatedCheckInNoteText = `AT_C410938_cin_${randomPostfix}`;
    const updatedExportedMarcFileName = `AT_C410938_updatedExportedMarc_${randomPostfix}.mrc`;

    const exportMappingProfile = { name: `AT_C410938_ExportMappingProfile_${randomPostfix}` };
    const exportJobProfile = { name: `AT_C410938_ExportJobProfile_${randomPostfix}` };

    const instanceMappingProfile = { name: `AT_C410938_InstanceMappingProfile_${randomPostfix}` };
    const instanceActionProfile = {
      name: `AT_C410938_InstanceActionProfile_${randomPostfix}`,
      action: 'CREATE',
      folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };

    const holdingsMappingProfile = { name: `AT_C410938_HoldingsMappingProfile_${randomPostfix}` };
    const holdingsActionProfile = {
      name: `AT_C410938_HoldingsActionProfile_${randomPostfix}`,
      action: 'CREATE',
      folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
    };

    const itemMappingProfile = { name: `AT_C410938_ItemMappingProfile_${randomPostfix}` };
    const itemActionProfile = {
      name: `AT_C410938_ItemActionProfile_${randomPostfix}`,
      action: 'CREATE',
      folioRecordType: EXISTING_RECORD_NAMES.ITEM,
    };

    const jobProfile = { name: `AT_C410938_JobProfile_${randomPostfix}` };

    const itemUpdateMappingProfile = {
      name: `AT_C410938_ItemUpdateMappingProfile_${randomPostfix}`,
    };
    const itemUpdateActionProfile = {
      name: `AT_C410938_ItemUpdateActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.ITEM,
    };

    const matchProfile = {
      profileName: `AT_C410938_MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '945', in1: '*', in2: '*', subfield: 'a' },
      existingRecordType: EXISTING_RECORD_NAMES.ITEM,
      existingMatchExpressionValue: 'item.hrid',
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };

    const updateJobProfile = { profileName: `AT_C410938_UpdateJobProfile_${randomPostfix}` };

    before('Create test data via API', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C410938_');

      cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*" and name<>"*auto*")' })
        .then((res) => {
          testData.locationName = res.name;
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*" and name<>"*auto*"' }).then(
            (loanTypes) => {
              testData.loanTypeName = loanTypes[0].name;
            },
          );
          cy.getMaterialTypes({ limit: 1, query: 'name<>"AT_*" and name<>"*auto*"' }).then(
            (res2) => {
              testData.materialTypeName = res2.name;
            },
          );
        })
        .then(() => {
          return ExportNewFieldMappingProfile.createNewFieldMappingProfileForItemHridViaApi(
            exportMappingProfile.name,
            '945',
            'a',
          )
            .then((response) => {
              exportMappingProfile.id = response.body.id;
              return ExportNewJobProfile.createNewJobProfileViaApi(
                exportJobProfile.name,
                exportMappingProfile.id,
              );
            })
            .then((response) => {
              exportJobProfile.id = response.body.id;
            });
        })
        .then(() => {
          return FieldMappingProfiles.createMappingProfileViaApi({
            profile: {
              name: instanceMappingProfile.name,
              incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
              mappingDetails: {
                name: FOLIO_RECORD_TYPE.INSTANCE.toLowerCase(),
                recordType: EXISTING_RECORD_NAMES.INSTANCE,
                mappingFields: [],
              },
            },
            addedRelations: [],
            deletedRelations: [],
          })
            .then(({ body }) => {
              return NewActionProfile.createActionProfileViaApi(instanceActionProfile, body.id);
            })
            .then((apResponse) => {
              instanceActionProfile.id = apResponse.body.id;
            });
        })
        .then(() => {
          return FieldMappingProfiles.createMappingProfileViaApi({
            profile: {
              name: holdingsMappingProfile.name,
              incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
              mappingDetails: {
                name: FOLIO_RECORD_TYPE.HOLDINGS.toLowerCase(),
                recordType: EXISTING_RECORD_NAMES.HOLDINGS,
                mappingFields: [
                  {
                    name: 'permanentLocationId',
                    enabled: true,
                    path: 'holdings.permanentLocationId',
                    value: `"${testData.locationName}"`,
                    subfields: [],
                  },
                ],
              },
            },
            addedRelations: [],
            deletedRelations: [],
          })
            .then(({ body }) => {
              return NewActionProfile.createActionProfileViaApi(holdingsActionProfile, body.id);
            })
            .then((apResponse) => {
              holdingsActionProfile.id = apResponse.body.id;
            });
        })
        .then(() => {
          return FieldMappingProfiles.createMappingProfileViaApi({
            profile: {
              name: itemMappingProfile.name,
              incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              existingRecordType: EXISTING_RECORD_NAMES.ITEM,
              mappingDetails: {
                name: FOLIO_RECORD_TYPE.ITEM.toLowerCase(),
                recordType: EXISTING_RECORD_NAMES.ITEM,
                mappingFields: [
                  {
                    name: 'materialType.id',
                    enabled: true,
                    path: 'item.materialType.id',
                    value: `"${testData.materialTypeName}"`,
                    subfields: [],
                  },
                  {
                    name: 'permanentLoanType.id',
                    enabled: true,
                    path: 'item.permanentLoanType.id',
                    value: `"${testData.loanTypeName}"`,
                    subfields: [],
                  },
                  {
                    name: 'status.name',
                    enabled: true,
                    path: 'item.status.name',
                    value: `"${ITEM_STATUS_NAMES.AVAILABLE}"`,
                    subfields: [],
                  },
                  {
                    name: 'circulationNotes',
                    enabled: true,
                    path: 'item.circulationNotes[]',
                    value: '',
                    repeatableFieldAction: 'EXTEND_EXISTING',
                    subfields: [
                      {
                        order: 0,
                        path: 'item.circulationNotes[]',
                        fields: [
                          {
                            name: 'noteType',
                            enabled: true,
                            path: 'item.circulationNotes[].noteType',
                            value: '"Check out"',
                          },
                          {
                            name: 'note',
                            enabled: true,
                            path: 'item.circulationNotes[].note',
                            value: '901$a',
                          },
                          {
                            name: 'staffOnly',
                            enabled: true,
                            path: 'item.circulationNotes[].staffOnly',
                            value: '',
                            booleanFieldAction: 'ALL_TRUE',
                          },
                        ],
                      },
                      {
                        order: 1,
                        path: 'item.circulationNotes[]',
                        fields: [
                          {
                            name: 'noteType',
                            enabled: true,
                            path: 'item.circulationNotes[].noteType',
                            value: '"Check in"',
                          },
                          {
                            name: 'note',
                            enabled: true,
                            path: 'item.circulationNotes[].note',
                            value: '901$b',
                          },
                          {
                            name: 'staffOnly',
                            enabled: true,
                            path: 'item.circulationNotes[].staffOnly',
                            value: '',
                            booleanFieldAction: 'ALL_TRUE',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
            addedRelations: [],
            deletedRelations: [],
          })
            .then(({ body }) => {
              return NewActionProfile.createActionProfileViaApi(itemActionProfile, body.id);
            })
            .then((apResponse) => {
              itemActionProfile.id = apResponse.body.id;
            });
        })
        .then(() => {
          return NewJobProfile.createJobProfileWithLinkedThreeActionProfilesViaApi(
            jobProfile,
            instanceActionProfile.id,
            holdingsActionProfile.id,
            itemActionProfile.id,
          ).then((jpId) => {
            jobProfile.id = jpId;
          });
        })
        .then(() => {
          return DataImport.uploadFileViaApi(
            marcBibFileName,
            firstImportFileName,
            jobProfile.name,
          ).then((response) => {
            testData.instanceId1 = response[0].instance.id;
            testData.instanceId2 = response[1].instance.id;
          });
        })
        .then(() => {
          return cy
            .createTempUser([
              Permissions.moduleDataImportEnabled.gui,
              Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
              Permissions.inventoryAll.gui,
              Permissions.settingsDataImportEnabled.gui,
            ])
            .then((userProperties) => {
              testData.user = userProperties;
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.dataImportPath,
                waiter: DataImport.waitLoading,
              });
            });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user?.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(updateJobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(itemUpdateActionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(itemUpdateMappingProfile.name);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.name);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(instanceActionProfile.name);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(holdingsActionProfile.name);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(itemActionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(instanceMappingProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(holdingsMappingProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(itemMappingProfile.name);
      if (exportJobProfile.id) ExportJobProfiles.deleteJobProfileViaApi(exportJobProfile.id);
      if (exportMappingProfile.id) DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(exportMappingProfile.id);
      if (testData.instanceId1) InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId1);
      if (testData.instanceId2) InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId2);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${updatedExportedMarcFileName}`);
      FileManager.deleteFile(`cypress/downloads/${exportedMarcFileName}`);
    });

    it(
      "C410938 Verify that empty Circulation notes don't make Item uneditable after import (promin)",
      { tags: ['extendedPath', 'promin', 'C410938'] },
      () => {
        // Step 7: Open import job log for the initial import
        Logs.openFileDetails(firstImportFileName.replace('.mrc', ''));

        // Step 8: Verify both records have Created statuses for SRS, Instance, Holdings, Item
        FileDetails.checkItemsStatusesInResultList(0, [
          FileDetails.status.created,
          FileDetails.status.created,
          FileDetails.status.created,
          FileDetails.status.created,
        ]);
        FileDetails.checkItemsStatusesInResultList(1, [
          FileDetails.status.created,
          FileDetails.status.created,
          FileDetails.status.created,
          FileDetails.status.created,
        ]);

        // Step 9-10: Navigate to item 1 (with 901 notes); verify Check out and Check in notes
        FileDetails.openItemInInventoryByTitle(instanceTitle1, 5, FileDetails.status.created);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckOutNote(checkOutNoteText);
        ItemRecordView.checkCheckInNote(checkInNoteText);

        // Step 11: Navigate to item 2 (no 901 field); verify no circulation notes
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.openItemInInventoryByTitle(instanceTitle2, 5, FileDetails.status.created);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckOutNote('No value set-');
        ItemRecordView.checkCheckInNote('No value set-');

        // Steps 12-15: Export both instances as MARC via API using the custom job profile
        FileManager.createFile(
          `cypress/fixtures/${csvFileName}`,
          `${testData.instanceId1}\n${testData.instanceId2}`,
        );
        ExportFile.exportFileViaApi(csvFileName, 'instance', exportJobProfile.name);
        ExportFile.downloadExportedMarcFile(exportedMarcFileName);

        // Step 16: Update 901 subfield values in record 1 (which has the 901 field)
        DataImport.editMarcFile(
          exportedMarcFileName,
          updatedExportedMarcFileName,
          [checkOutNoteText, checkInNoteText],
          [updatedCheckOutNoteText, updatedCheckInNoteText],
        );

        // Steps 17-18: Create Item Update field mapping profile (EXCHANGE_EXISTING) and action profile via API
        cy.then(() => {
          return FieldMappingProfiles.createMappingProfileViaApi({
            profile: {
              name: itemUpdateMappingProfile.name,
              incomingRecordType: INCOMING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
              existingRecordType: EXISTING_RECORD_NAMES.ITEM,
              mappingDetails: {
                name: FOLIO_RECORD_TYPE.ITEM.toLowerCase(),
                recordType: EXISTING_RECORD_NAMES.ITEM,
                mappingFields: [
                  {
                    name: 'circulationNotes',
                    enabled: true,
                    path: 'item.circulationNotes[]',
                    value: '',
                    repeatableFieldAction: 'EXCHANGE_EXISTING',
                    subfields: [
                      {
                        order: 0,
                        path: 'item.circulationNotes[]',
                        fields: [
                          {
                            name: 'noteType',
                            enabled: true,
                            path: 'item.circulationNotes[].noteType',
                            value: '"Check out"',
                          },
                          {
                            name: 'note',
                            enabled: true,
                            path: 'item.circulationNotes[].note',
                            value: '901$a',
                          },
                          {
                            name: 'staffOnly',
                            enabled: true,
                            path: 'item.circulationNotes[].staffOnly',
                            value: '',
                            booleanFieldAction: 'ALL_TRUE',
                          },
                        ],
                      },
                      {
                        order: 1,
                        path: 'item.circulationNotes[]',
                        fields: [
                          {
                            name: 'noteType',
                            enabled: true,
                            path: 'item.circulationNotes[].noteType',
                            value: '"Check in"',
                          },
                          {
                            name: 'note',
                            enabled: true,
                            path: 'item.circulationNotes[].note',
                            value: '901$b',
                          },
                          {
                            name: 'staffOnly',
                            enabled: true,
                            path: 'item.circulationNotes[].staffOnly',
                            value: '',
                            booleanFieldAction: 'ALL_TRUE',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
            addedRelations: [],
            deletedRelations: [],
          })
            .then(({ body }) => {
              itemUpdateMappingProfile.id = body.id;
              return NewActionProfile.createActionProfileViaApi(itemUpdateActionProfile, body.id);
            })
            .then((apResponse) => {
              itemUpdateActionProfile.id = apResponse.body.id;
            });
        })
          // Step 19: Create Match profile: incoming 945$a → existing Item HRID
          .then(() => {
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
              matchProfile,
            ).then(({ body }) => {
              matchProfile.id = body.id;
            });
          })
          // Step 20: Create Update Job profile linking match profile → item update action profile
          .then(() => {
            return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              updateJobProfile.profileName,
              matchProfile.id,
              itemUpdateActionProfile.id,
            ).then((jpId) => {
              updateJobProfile.id = jpId;
            });
          })
          // Step 21: Run the second import using the edited MARC file
          .then(() => {
            return DataImport.uploadFileViaApi(
              updatedExportedMarcFileName,
              secondImportFileName,
              updateJobProfile.profileName,
            );
          })
          // Step 22: Open the update import log; verify Item Updated for both records
          .then(() => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          });

        FileDetails.close();
        Logs.openFileDetails(secondImportFileName.replace('.mrc', ''));
        FileDetails.checkStatusInColumn(
          FileDetails.status.updated,
          FileDetails.columnNameInResultList.item,
          0,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.updated,
          FileDetails.columnNameInResultList.item,
          1,
        );

        // Steps 23-24 (switched): item 1 (index 0, had 901 updated) has the new note values
        FileDetails.openItemInInventoryByTitle(instanceTitle1, 5, FileDetails.status.updated);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckOutNote(updatedCheckOutNoteText);
        ItemRecordView.checkCheckInNote(updatedCheckInNoteText);

        // Steps 25-26 (switched): item 2 (index 1, no 901) has blank notes and is still editable
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.openItemInInventoryByTitle(instanceTitle2, 5, FileDetails.status.updated);
        ItemRecordView.waitLoading();
        ItemRecordView.checkCheckOutNote('No value set-');
        ItemRecordView.checkCheckInNote('No value set-');
        ItemRecordView.openItemEditForm(instanceTitle2);
        ItemRecordEdit.waitLoading(instanceTitle2);
        ItemRecordEdit.cancel();
      },
    );
  });
});
