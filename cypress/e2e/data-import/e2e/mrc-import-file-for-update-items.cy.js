import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import {
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  FOLIO_RECORD_TYPE,
  CALL_NUMBER_TYPE_NAMES,
  LOCATION_NAMES,
  EXPORT_TRANSFORMATION_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  PROFILE_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  HOLDINGS_TYPE_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../support/fragments/topMenu';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileManager from '../../../support/utils/fileManager';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import SettingsJobProfiles from '../../../support/fragments/settings/dataImport/settingsJobProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    let instanceHRID = null;
    // profile names for creating
    const nameMarcBibMappingProfile = `autotest_marcBib_mapping_profile_${getRandomPostfix()}`;
    const nameInstanceMappingProfile = `autotest_instance_mapping_profile_${getRandomPostfix()}`;
    const nameHoldingsMappingProfile = `autotest_holdings_mapping_profile_${getRandomPostfix()}`;
    const nameItemMappingProfile = `autotest_item_mapping_profile_${getRandomPostfix()}`;
    const nameMarcBibActionProfile = `autotest_marcBib_action_profile_${getRandomPostfix()}`;
    const nameInstanceActionProfile = `autotest_instance_action_profile_${getRandomPostfix()}`;
    const nameHoldingsActionProfile = `autotest_holdings_action_profile_${getRandomPostfix()}`;
    const nameItemActionProfile = `autotest_item_action_profile_${getRandomPostfix()}`;
    const jobProfileNameCreate = `autotest_job_profile_${getRandomPostfix()}`;
    const recordType = 'MARC_BIBLIOGRAPHIC';
    // file names
    const nameMarcFileForImportCreate = `C343335autotestFile.${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `autotestFile${getRandomPostfix()}.csv`;
    const nameMarcFileForImportUpdate = `C343335autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileNameForExport = `autoTestJobProf.${getRandomPostfix()}`;

    const marcBibMappingProfile = {
      profile: {
        id: '',
        name: nameMarcBibMappingProfile,
        incomingRecordType: recordType,
        existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
        mappingDetails: {
          name: 'holdings',
          recordType: 'MARC_BIBLIOGRAPHIC',
          marcMappingDetails: [
            {
              order: 0,
              action: 'ADD',
              field: {
                field: '650',
                indicator2: '4',
                subfields: [
                  {
                    subfield: 'a',
                    data: {
                      text: 'Test update',
                    },
                  },
                ],
              },
            },
          ],
          marcMappingOption: 'MODIFY',
        },
      },
    };

    const instanceMappingProfile = {
      profile: {
        id: '',
        name: nameInstanceMappingProfile,
        incomingRecordType: recordType,
        existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      },
    };

    const holdingsMappingProfile = {
      profile: {
        id: '',
        name: nameHoldingsMappingProfile,
        incomingRecordType: recordType,
        existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
        mappingDetails: {
          name: 'holdings',
          recordType: 'HOLDINGS',
          mappingFields: [
            {
              name: 'permanentLocationId',
              enabled: true,
              path: 'holdings.permanentLocationId',
              value: '"Annex (KU/CC/DI/A)"',
            },
          ],
        },
      },
    };

    const itemMappingProfile = {
      profile: {
        id: '',
        name: nameItemMappingProfile,
        incomingRecordType: recordType,
        existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
        mappingDetails: {
          name: 'item',
          recordType: 'ITEM',
          mappingFields: [
            {
              name: 'materialType.id',
              enabled: true,
              path: 'item.materialType.id',
              value: '"book"',
              acceptedValues: { '1a54b431-2e4f-452d-9cae-9cee66c9a892': 'book' },
            },
            {
              name: 'permanentLoanType.id',
              enabled: true,
              path: 'item.permanentLoanType.id',
              value: '"Can circulate"',
              acceptedValues: { '2b94c631-fca9-4892-a730-03ee529ffe27': 'Can circulate' },
            },
            { name: 'status.name', enabled: true, path: 'item.status.name', value: '"In process"' },
          ],
        },
      },
    };

    const marcBibActionProfile = {
      profile: {
        id: '',
        name: nameMarcBibActionProfile,
        action: 'MODIFY',
        folioRecord: recordType,
      },
      addedRelations: [
        {
          masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
          detailProfileId: '',
          detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
        },
      ],
      deletedRelations: [],
    };

    const instanceActionProfile = {
      profile: {
        id: '',
        name: nameInstanceActionProfile,
        action: 'CREATE',
        folioRecord: 'INSTANCE',
      },
      addedRelations: [
        {
          masterProfileId: null,
          masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
          detailProfileId: '',
          detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
        },
      ],
      deletedRelations: [],
    };

    const holdingsActionProfile = {
      profile: {
        id: '',
        name: nameHoldingsActionProfile,
        action: 'CREATE',
        folioRecord: 'HOLDINGS',
      },
      addedRelations: [
        {
          masterProfileId: null,
          masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
          detailProfileId: '',
          detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
        },
      ],
      deletedRelations: [],
    };

    const itemActionProfile = {
      profile: {
        id: '',
        name: nameItemActionProfile,
        action: 'CREATE',
        folioRecord: 'ITEM',
      },
      addedRelations: [
        {
          masterProfileId: null,
          masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
          detailProfileId: '',
          detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
        },
      ],
      deletedRelations: [],
    };

    // TODO redesine classes inherites
    const testData = [
      { mappingProfile: marcBibMappingProfile, actionProfile: marcBibActionProfile },
      { mappingProfile: instanceMappingProfile, actionProfile: instanceActionProfile },
      { mappingProfile: holdingsMappingProfile, actionProfile: holdingsActionProfile },
      { mappingProfile: itemMappingProfile, actionProfile: itemActionProfile },
    ];

    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `autotestMappingInstance${getRandomPostfix()}`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `autotestActionInstance${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `autotestMappingHoldings${getRandomPostfix()}`,
          callNumberType: `"${CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS}"`,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `autotestActionHoldings${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `autotestMappingItem${getRandomPostfix()}`,
          materialType: `"${MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE}"`,
          status: ITEM_STATUS_NAMES.AVAILABLE,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `autotestActionItem${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
    ];

    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `autotestMatchInstance${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
          },
          existingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
        },
      },
      {
        matchProfile: {
          profileName: `autotestMatchHoldings${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '901',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
          holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
        },
      },
      {
        matchProfile: {
          profileName: `autotestMatchItem${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '902',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.itemHrid,
        },
      },
    ];
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `autotestJobProf${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    // create Field mapping profile for export
    const exportMappingProfile = {
      name: `autoTestMappingProf.${getRandomPostfix()}`,
      holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
      holdingsMarcField: '901',
      subfieldForHoldings: '$a',
      itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
      itemMarcField: '902',
      subfieldForItem: '$a',
    };

    beforeEach('create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      cy.getAdminToken();

      const jobProfile = {
        profile: {
          name: jobProfileNameCreate,
          dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        },
        addedRelations: [],
        deletedRelations: [],
      };

      testData.jobProfileForCreate = jobProfile;

      testData.forEach((specialPair) => {
        cy.createOnePairMappingAndActionProfiles(
          specialPair.mappingProfile,
          specialPair.actionProfile,
        ).then((idActionProfile) => {
          cy.addJobProfileRelation(testData.jobProfileForCreate.addedRelations, idActionProfile);
        });
      });
      SettingsJobProfiles.createJobProfileApi(testData.jobProfileForCreate).then(
        (bodyWithjobProfile) => {
          testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
        },
      );
    });

    afterEach('delete test data', () => {
      // delete generated profiles
      JobProfiles.deleteJobProfile(jobProfileForUpdate.profileName);
      collectionOfMatchProfiles.forEach((profile) => {
        MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
      });
      collectionOfMappingAndActionProfiles.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      JobProfiles.deleteJobProfile(jobProfileNameCreate);
      ActionProfiles.deleteActionProfile(nameMarcBibActionProfile);
      ActionProfiles.deleteActionProfile(nameInstanceActionProfile);
      ActionProfiles.deleteActionProfile(nameHoldingsActionProfile);
      ActionProfiles.deleteActionProfile(nameItemActionProfile);
      FieldMappingProfileView.deleteViaApi(nameMarcBibMappingProfile);
      FieldMappingProfileView.deleteViaApi(nameInstanceMappingProfile);
      FieldMappingProfileView.deleteViaApi(nameHoldingsMappingProfile);
      FieldMappingProfileView.deleteViaApi(nameItemMappingProfile);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForImportUpdate}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
        (instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
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
      NewFieldMappingProfile.addElectronicAccess('"Resource"', '856$u');
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
      NewFieldMappingProfile.fillStatus(profile.status);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };

    it(
      'C343335 MARC file upload with the update of instance, holding, and items (folijet)',
      { tags: [TestTypes.smoke, DevTeams.folijet] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        // upload a marc file for creating of the new instance, holding and item
        DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForImportCreate);
        JobProfiles.search(testData.jobProfileForCreate.profile.name);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameMarcFileForImportCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForImportCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(0, '1');
        FileDetails.checkItemsQuantityInSummaryTable(1, '0');

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;

          // download .csv file
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
          InventorySearchAndFilter.saveUUIDs();
          ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
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
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(nameMarcFileForImportUpdate);
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameMarcFileForImportUpdate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForImportUpdate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(1, '1');
      },
    );
  });
});
