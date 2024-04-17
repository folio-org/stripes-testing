import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  CALL_NUMBER_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  EXPORT_TRANSFORMATION_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  PROFILE_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
// import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  //   ActionProfiles as SettingsActionProfiles,
  //   FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
// import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';

describe('Data Import', () => {
  describe('Log details', () => {
    // let instanceHrid;
    const subject = `Test update${getRandomPostfix()}`;
    const filePath = 'marcBibFileNameC430253.mrc';
    const nameMarcFileForImportCreate = `C430253 autotestFileForCreate${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C430253 autotestFile${getRandomPostfix()}.csv`;
    const nameMarcFileForImportUpdate = `C430253 autotestExportedFile${getRandomPostfix()}.mrc`;
    // profiles for creating instance, holdings, item
    const marcBibMappingProfile = {
      profile: {
        id: '',
        name: `C430253 marcBib mapping profile${getRandomPostfix()}`,
        incomingRecordType: 'MARC_BIBLIOGRAPHIC',
        existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
        mappingDetails: {
          name: 'marcBib',
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
                      text: subject,
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
        name: `C430253 instance mapping profile${getRandomPostfix()}`,
        incomingRecordType: 'MARC_BIBLIOGRAPHIC',
        existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      },
    };
    const holdingsMappingProfile = {
      profile: {
        id: '',
        name: `C430253 holdings mapping profile${getRandomPostfix()}`,
        incomingRecordType: 'MARC_BIBLIOGRAPHIC',
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
        name: `C430253 item mapping profile${getRandomPostfix()}`,
        incomingRecordType: 'MARC_BIBLIOGRAPHIC',
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
        name: `C430253 marcBib action profile${getRandomPostfix()}`,
        action: 'MODIFY',
        folioRecord: 'MARC_BIBLIOGRAPHIC',
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
        name: `C430253 instance action profile${getRandomPostfix()}`,
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
        name: `C430253 holdings action profile${getRandomPostfix()}`,
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
        name: `C430253 item action profile${getRandomPostfix()}`,
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
    const exportMappingProfile = {
      name: `C430253 mapping profile ${getRandomPostfix()}`,
      holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
      holdingsMarcField: '901',
      subfieldForHoldings: '$h',
      itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
      itemMarcField: '902',
      subfieldForItem: '$i',
    };
    const jobProfileNameForExport = `C430253 job profile.${getRandomPostfix()}`;
    // profiles for updating instance, holdings, item
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          name: `C430253 update instance mapping profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          catalogedDate: '###TODAY###',
          // catalogedDateUi: DateTools.getFormattedDate({ date: new Date() }),
          // instanceStatus: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          statisticalCodeUI: 'Book, print (books)',
        },
        actionProfile: {
          name: `C430253 update instance action profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          name: `C430253 update holdings mapping profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
          permanentLocationUI: LOCATION_NAMES.ONLINE_UI,
          callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          callNumber: '050$a " " 050$b',
          relationship: 'Resource',
          uri: '856$u',
        },
        actionProfile: {
          name: `C430253 update holdings action profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          name: `C430253 update item mapping profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          materialType: MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE,
          noteType: '"Electronic bookplate"',
          note: '"Smith Family Foundation"',
          noteUI: 'Smith Family Foundation',
          staffOnly: 'Mark for all affected records',
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          name: `C430253 update item action profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C430253 MARC-to-MARC 001 to 001 match profile ${getRandomPostfix()}`,
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
          profileName: `C430253 MARC-to-Holdings 901h to Holdings HRID match profile ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '901',
            subfield: 'h',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
          holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
        },
      },
      {
        matchProfile: {
          profileName: `C430253 MARC-to-Item 902i to Item HRID match profile ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '902',
            subfield: 'i',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.itemHrid,
        },
      },
    ];
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C430253 update job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('login', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    it(
      'C430253 Check import summary table with "Updated" actions for instance, holding and item (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        const jobProfile = {
          profile: {
            // name: jobProfileNameCreate,
            dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
          },
          addedRelations: [],
          deletedRelations: [],
        };

        const testData = [
          { mappingProfile: marcBibMappingProfile, actionProfile: marcBibActionProfile },
          { mappingProfile: instanceMappingProfile, actionProfile: instanceActionProfile },
          { mappingProfile: holdingsMappingProfile, actionProfile: holdingsActionProfile },
          { mappingProfile: itemMappingProfile, actionProfile: itemActionProfile },
        ];
        testData.jobProfileForCreate = jobProfile;

        testData.forEach((specialPair) => {
          cy.createOnePairMappingAndActionProfiles(
            specialPair.mappingProfile,
            specialPair.actionProfile,
          ).then((idActionProfile) => {
            cy.addJobProfileRelation(testData.jobProfileForCreate.addedRelations, idActionProfile);
          });
        });
        SettingsJobProfiles.createJobProfileViaApi(testData.jobProfileForCreate).then(
          (bodyWithjobProfile) => {
            testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
          },
        );
        DataImport.verifyUploadState();
        // upload a marc file for creating of the new instance, holding and item
        DataImport.uploadFile(filePath, nameMarcFileForImportCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(testData.jobProfileForCreate.profile.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFileForImportCreate);
        Logs.checkJobStatus(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForImportCreate);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        // InventoryInstance.getAssignedHRID().then((hrid) => {
        //   instanceHrid = hrid;
        // });
        InstanceRecordView.verifyInstanceSource('MARC');
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.ONLINE_UI} >`);
        InventoryInstance.openItemByBarcode('No barcode');

        cy.visit(SettingsMenu.exportMappingProfilePath);
        ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);

        cy.visit(SettingsMenu.exportJobProfilePath);
        ExportJobProfiles.createJobProfile(jobProfileNameForExport, exportMappingProfile.name);

        // download .csv file
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.selectYesfilterStaffSuppress();
        InventorySearchAndFilter.searchInstancesWithOption('Subject', subject);
        InstanceRecordView.verifyInstancePaneExists();
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        cy.getAdminToken().then(() => {
          ExportFile.uploadFile(nameForCSVFile);
          ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
          ExportFile.downloadExportedMarcFile(nameMarcFileForImportUpdate);
        });

        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
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
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.fillHoldingsType(
          collectionOfMappingAndActionProfiles[1].mappingProfile.holdingsType,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.fillCallNumberType(
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.callNumberType}"`,
        );
        NewFieldMappingProfile.fillCallNumber(
          collectionOfMappingAndActionProfiles[1].mappingProfile.callNumber,
        );
        NewFieldMappingProfile.addElectronicAccess(
          collectionOfMappingAndActionProfiles[1].mappingProfile.typeValue,
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.relationship}"`,
          collectionOfMappingAndActionProfiles[1].mappingProfile.uri,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[2].mappingProfile,
        );
        NewFieldMappingProfile.fillMaterialType(
          `"${collectionOfMappingAndActionProfiles[2].mappingProfile.materialType}"`,
        );
        NewFieldMappingProfile.addItemNotes(
          collectionOfMappingAndActionProfiles[2].mappingProfile.noteType,
          collectionOfMappingAndActionProfiles[2].mappingProfile.note,
          collectionOfMappingAndActionProfiles[2].mappingProfile.staffOnly,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(
          `"${collectionOfMappingAndActionProfiles[2].mappingProfile.status}"`,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );

        // create action profiles
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        collectionOfMatchProfiles.forEach((profile) => {
          MatchProfiles.createMatchProfile(profile.matchProfile);
          MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
        });

        // create job profile
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
      },
    );
  });
});
