import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  CALL_NUMBER_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  EXPORT_TRANSFORMATION_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let instanceHRID = null;
    const mappingProfileIds = [];
    const actionProfileIds = [];
    // file names
    const nameMarcFileForImportCreate = `C343335 autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `autotestFile${getRandomPostfix()}.csv`;
    const nameMarcFileForImportUpdate = `C343335 autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileNameForExport = `autoTestJobProf.${getRandomPostfix()}`;
    // profile for creating
    const marcBibMappingProfileForCreate = {
      name: `C343335 create marcBib mapping profile ${getRandomPostfix()}`,
      updatingText: `Test update ${getRandomPostfix()}`,
      subfield: 'a',
      fieldNumber: '650',
      indicator2: '4',
    };
    const instanceMappingProfileForCreate = {
      name: `C343335 create instance mapping profile ${getRandomPostfix()}`,
    };
    const holdingsMappingProfileForCreate = {
      name: `C343335 create holdings mapping profile ${getRandomPostfix()}`,
      permanentLocation: 'Main Library (KU/CC/DI/M)',
    };
    const itemMappingProfileForCreate = {
      name: `C343335 create item mapping profile ${getRandomPostfix()}`,
      materialType: 'book',
      permanentLoanType: 'Can circulate',
      status: 'Available',
    };
    const actionProfilesForCreate = [
      {
        actionProfile: {
          name: `C343335 create marcBib action profile ${getRandomPostfix()}`,
          action: 'MODIFY',
          folioRecordType: 'MARC_BIBLIOGRAPHIC',
        },
      },
      {
        actionProfile: {
          name: `C343335 create instance action profile ${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        actionProfile: {
          name: `C343335 create holdings action profile ${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'HOLDINGS',
        },
      },
      {
        actionProfile: {
          name: `C343335 create item action profile ${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'ITEM',
        },
      },
    ];
    const jobProfileForCreate = {
      name: `C343335 create job profile ${getRandomPostfix()}`,
    };
    // profiles for updating
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C343335 autotestMappingInstance${getRandomPostfix()}`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C343335 autotestActionInstance${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C343335 autotestMappingHoldings${getRandomPostfix()}`,
          callNumberType: `"${CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS}"`,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C343335 autotestActionHoldings${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C343335 autotestMappingItem${getRandomPostfix()}`,
          materialType: `"${MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE}"`,
          status: ITEM_STATUS_NAMES.AVAILABLE,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C343335 autotestActionItem${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];

    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C343335 autotestMatchInstance${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
          },
          existingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
        },
      },
      {
        matchProfile: {
          profileName: `C343335 autotestMatchHoldings${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '901',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
        },
      },
      {
        matchProfile: {
          profileName: `C343335 autotestMatchItem${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '902',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.itemHrid,
        },
      },
    ];
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C343335 autotestJobProf${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    // create Field mapping profile for export
    const exportMappingProfile = {
      name: `C343335 autoTestMappingProf.${getRandomPostfix()}`,
      holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
      holdingsMarcField: '901',
      subfieldForHoldings: '$a',
      itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
      itemMarcField: '902',
      subfieldForItem: '$a',
    };

    beforeEach('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createModifyMarcBibMappingProfileViaApi(
        marcBibMappingProfileForCreate,
      ).then((mappingProfileResponse) => {
        mappingProfileIds.push(mappingProfileResponse.body.id);

        NewActionProfile.createActionProfileViaApi(
          actionProfilesForCreate[0].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          actionProfileIds.push(actionProfileResponse.body.id);
        });
      });
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(
        instanceMappingProfileForCreate,
      ).then((mappingProfileResponse) => {
        mappingProfileIds.push(mappingProfileResponse.body.id);

        NewActionProfile.createActionProfileViaApi(
          actionProfilesForCreate[1].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          actionProfileIds.push(actionProfileResponse.body.id);
        });
      });
      NewFieldMappingProfile.createHoldingsMappingProfileViaApi(
        holdingsMappingProfileForCreate,
      ).then((mappingProfileResponse) => {
        mappingProfileIds.push(mappingProfileResponse.body.id);

        NewActionProfile.createActionProfileViaApi(
          actionProfilesForCreate[2].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          actionProfileIds.push(actionProfileResponse.body.id);
        });
      });
      NewFieldMappingProfile.createItemMappingProfileViaApi(itemMappingProfileForCreate)
        .then((mappingProfileResponse) => {
          mappingProfileIds.push(mappingProfileResponse.body.id);

          NewActionProfile.createActionProfileViaApi(
            actionProfilesForCreate[3].actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            actionProfileIds.push(actionProfileResponse.body.id);
          });
        })
        .then(() => {
          NewJobProfile.createJobProfileWithLinkedFourActionProfilesViaApi(
            jobProfileForCreate,
            actionProfileIds[0],
            actionProfileIds[1],
            actionProfileIds[2],
            actionProfileIds[3],
          );
        });

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    });

    afterEach('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForImportUpdate}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      FileManager.deleteFileFromDownloadsByMask('*SearchInstanceUUIDs*');
      cy.getAdminToken().then(() => {
        // delete generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        collectionOfMatchProfiles.forEach((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
        });
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.name);
        actionProfileIds.forEach((id) => {
          SettingsActionProfiles.deleteActionProfileViaApi(id);
        });
        mappingProfileIds.forEach((id) => {
          SettingsFieldMappingProfiles.deleteMappingProfileViaApi(id);
        });
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
          (instance) => {
            cy.deleteItemViaApi(instance.items[0].id);
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    const createInstanceMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.fillCatalogedDate('###TODAY###');
      NewFieldMappingProfile.fillInstanceStatusTerm();
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };

    const createHoldingsMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.fillHoldingsType(HOLDINGS_TYPE_NAMES.ELECTRONIC);
      NewFieldMappingProfile.fillPermanentLocation(profile.permanentLocation);
      NewFieldMappingProfile.fillCallNumberType(profile.callNumberType);
      NewFieldMappingProfile.fillCallNumber('050$a " " 050$b');
      NewFieldMappingProfile.addElectronicAccess(profile.typeValue, '"Resource"', '856$u');
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };

    const createItemMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.fillMaterialType(profile.materialType);
      NewFieldMappingProfile.addItemNotes(
        '"Electronic bookplate"',
        '"Smith Family Foundation"',
        'Mark for all affected records',
      );
      NewFieldMappingProfile.fillPermanentLoanType(profile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(`"${profile.status}"`);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };

    it(
      'C343335 MARC file upload with the update of instance, holding, and items (folijet)',
      { tags: ['smoke', 'folijet'] },
      () => {
        DataImport.verifyUploadState();
        // upload a marc file for creating of the new instance, holding and item
        DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForImportCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreate.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFileForImportCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForImportCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(0, '1');
        FileDetails.checkItemsQuantityInSummaryTable(1, '0');

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;

          // download .csv file
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.selectYesfilterStaffSuppress();
          cy.wait(1500);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
          cy.intercept('/search/instances?query=id**').as('getIds');
          InventorySearchAndFilter.saveUUIDs();
          cy.wait('@getIds', getLongDelay()).then((req) => {
            const expectedUUID = InventorySearchAndFilter.getUUIDFromRequest(req);

            FileManager.createFile(`cypress/fixtures/${nameForCSVFile}`, expectedUUID);
          });
        });

        cy.visit(SettingsMenu.exportMappingProfilePath);
        ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);

        cy.visit(SettingsMenu.exportJobProfilePath);
        ExportJobProfiles.createJobProfile(jobProfileNameForExport, exportMappingProfile.name);

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
        ExportFile.downloadExportedMarcFile(nameMarcFileForImportUpdate);

        // create mapping and action profiles
        cy.visit(SettingsMenu.mappingProfilePath);
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

        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create Match profile
        cy.visit(SettingsMenu.matchProfilePath);
        collectionOfMatchProfiles.forEach((profile) => {
          MatchProfiles.createMatchProfile(profile.matchProfile);
          MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
        });

        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfilesForUpdate(jobProfileForUpdate);
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[0].matchProfile.profileName,
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[1].matchProfile.profileName,
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
          2,
        );
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[2].matchProfile.profileName,
          collectionOfMappingAndActionProfiles[2].actionProfile.name,
          4,
        );
        NewJobProfile.saveAndClose();

        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(nameMarcFileForImportUpdate);
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFileForImportUpdate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForImportUpdate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(1, '1');
      },
    );
  });
});
