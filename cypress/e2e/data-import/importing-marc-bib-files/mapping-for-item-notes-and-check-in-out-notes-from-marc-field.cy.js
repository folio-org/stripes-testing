import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import {
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  JOB_STATUS_NAMES
} from '../../../support/constants';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  const rowNumbers = [0, 1];
  const instanceHrids = [];
  const marcFileName = `C368005 autotestFile.${getRandomPostfix}.mrc`;
  const itemNotes = {
    note: 'This is a plain note',
    checkInNoteForFirstItem: 'This is a check in note',
    blindingNote: 'This is a binding note',
    electronicBookplate: 'This is an electronic bookplate note',
    checkOutNote: 'This is a check out note',
    checkInNoteForSecondItem: 'This is a check in note',
    staffOnly: 'Yes'
  };
  const collectionOfProfiles = [
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C368005 Create instance for mapping notes ${getRandomPostfix}`,
        catalogingDate: '###TODAY###' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C368005 Create instance for mapping notes ${getRandomPostfix}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C368005 Create holdings for mapping notes ${getRandomPostfix}`,
        permanetLocation: `"${LOCATION_NAMES.ANNEX}"` },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C368005 Create holdings for mapping notes ${getRandomPostfix}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C368005 Create item for mapping notes ${getRandomPostfix}`,
        materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
        noteType: '876$t',
        note: '876$n',
        staffOnly: 'Mark for all affected records',
        noteTypeForCheckIn: '878$t',
        noteForCheckIn: '878$a',
        staffOnlyForCheckIn: 'Mark for all affected records',
        permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        status: ITEM_STATUS_NAMES.AVAILABLE },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C368005 Create items for mapping notes ${getRandomPostfix}` }
    }
  ];
  const jobProfile = { ...NewJobProfile.defaultJobProfile,
    profileName: `C368005 Create mappings for item notes ${getRandomPostfix}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC };

  before('create test data', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    // delete generated profiles
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    collectionOfProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    instanceHrids.forEach(hrid => {
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` })
        .then((instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
    });
  });

  it('C368005 Verify the mapping for item record notes and check in/out notes from MARC field (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create Field mapping profiles
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfiles[2].mappingProfile);
      NewFieldMappingProfile.fillMaterialType(collectionOfProfiles[2].mappingProfile.materialType);
      NewFieldMappingProfile.addItemNotes(collectionOfProfiles[2].mappingProfile.noteType, collectionOfProfiles[2].mappingProfile.note, collectionOfProfiles[2].mappingProfile.staffOnly);
      NewFieldMappingProfile.addCheckInCheckOutNote(collectionOfProfiles[2].mappingProfile.noteTypeForCheckIn, collectionOfProfiles[2].mappingProfile.noteForCheckIn, collectionOfProfiles[2].mappingProfile.staffOnlyForCheckIn);
      NewFieldMappingProfile.fillPermanentLoanType(collectionOfProfiles[2].mappingProfile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(collectionOfProfiles[2].mappingProfile.status);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfProfiles[2].mappingProfile.name);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfiles[2].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfiles[1].mappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(collectionOfProfiles[1].mappingProfile.permanetLocation);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfProfiles[1].mappingProfile.name);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfiles[1].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfiles[0].mappingProfile);
      NewFieldMappingProfile.fillCatalogedDate(collectionOfProfiles[0].mappingProfile.catalogingDate);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfProfiles[0].mappingProfile.name);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfiles[0].mappingProfile.name);

      // create Action profiles
      collectionOfProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create Job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(collectionOfProfiles[0].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfProfiles[1].actionProfile);
      NewJobProfile.linkActionProfile(collectionOfProfiles[2].actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      // upload a marc file
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile('marcFileForC368005.mrc', marcFileName);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(marcFileName);
      [FileDetails.columnNameInResultList.srsMarc,
        FileDetails.columnNameInResultList.instance,
        FileDetails.columnNameInResultList.holdings,
        FileDetails.columnNameInResultList.item
      ].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName, 1);
      });
      FileDetails.checkItemsQuantityInSummaryTable(0, '2');

      // get instance hrids
      rowNumbers.forEach(row => {
        FileDetails.openInstanceInInventory('Created', row);
        InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
          instanceHrids.push(initialInstanceHrId);
        });
        cy.go('back');
      });

      // check item notes in Inventory
      FileDetails.openItemInInventory('Created');
      ItemRecordView.checkItemNote(itemNotes.note, itemNotes.staffOnly);
      ItemRecordView.checkCheckInNote(itemNotes.checkInNoteForFirstItem);
      cy.go('back');
      FileDetails.openItemInInventory('Created', 1);
      ItemRecordView.checkBindingNote(itemNotes.blindingNote);
      ItemRecordView.checkElectronicBookplateNote(itemNotes.electronicBookplate);
      ItemRecordView.checkCheckOutNote(itemNotes.checkOutNote);
      ItemRecordView.checkCheckInNote(itemNotes.checkInNoteForSecondItem);
    });
});
