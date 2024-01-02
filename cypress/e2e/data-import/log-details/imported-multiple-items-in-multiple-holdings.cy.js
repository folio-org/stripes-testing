import {
  ACCEPTED_DATA_TYPE_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const holdingsData = [
      { permanentLocation: LOCATION_NAMES.MAIN_LIBRARY_UI, itemsQuqntity: 3 },
      { permanentLocation: LOCATION_NAMES.ANNEX_UI, itemsQuqntity: 2 },
      { permanentLocation: LOCATION_NAMES.ONLINE_UI, itemsQuqntity: 1 },
    ];
    const title =
      'Crossfire : a litany for survival : poems 1998-2019 / Staceyann Chin ; foreword by Jacqueline Woodson.';
    const fileWithErrorsPathForUpload = 'marcBibFileForMultipleWithErrors.mrc';
    const fileWioutErrorsPathForUpload = 'marcBibFileForMultipleWithoutErrors.mrc';
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `Test multiple holdings.${getRandomPostfix()}`,
          permanentLocation: '945$h',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `Test multiple holdings.${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `Test multiple items.${getRandomPostfix()}`,
          materialType: '945$a',
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `Test multiple items.${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `Test multiple items.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });

        // create mapping profiles
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[0].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.fillMaterialType(
          collectionOfMappingAndActionProfiles[1].mappingProfile.materialType,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.status}"`,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create action profiles
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfileByName('Default - Create instance');
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);
      });
    });

    beforeEach('login', () => {
      cy.login(user.username, user.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        JobProfiles.deleteJobProfile(jobProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          ActionProfiles.deleteActionProfile(profile.actionProfile.name);
          FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C388506 Check the log result table for imported multiple items with errors in multiple holdings (folijet)',
      { tags: ['criticalPath', 'folijet', 'nonParallel'] },
      () => {
        let instanceHRID;
        const marcFileName = `C388506 multipleAutotestFileName.${getRandomPostfix()}`;
        const arrayOfHoldingsWithErrorsStatuses = [
          'Created (KU/CC/DI/M)',
          'Created (KU/CC/DI/A)',
          'Created (E)',
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.NO_ACTION,
        ];
        const quantityOfCreatedHoldings = 5;
        const quantityOfCreatedItems = 8;
        const quantityOfErrors = 5;

        // upload .mrc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(fileWithErrorsPathForUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.verifyMultipleHoldingsStatus(
          arrayOfHoldingsWithErrorsStatuses,
          quantityOfCreatedHoldings,
        );
        FileDetails.verifyMultipleItemsStatus(quantityOfCreatedItems);
        FileDetails.verifyMultipleErrorStatus(quantityOfErrors);

        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;

          InventoryInstance.checkIsHoldingsCreated([`${holdingsData[0].permanentLocation} >`]);
          InventoryInstance.openHoldingsAccordion(`${holdingsData[0].permanentLocation} >`);
          InstanceRecordView.verifyQuantityOfItemsRelatedtoHoldings(
            holdingsData[0].permanentLocation,
            holdingsData[0].itemsQuqntity,
          );

          cy.getAdminToken().then(() => {
            cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
              (instance) => {
                instance.items.forEach((item) => cy.deleteItemViaApi(item.id));
                instance.holdings.forEach((holding) => cy.deleteHoldingRecordViaApi(holding.id));
                InventoryInstance.deleteInstanceViaApi(instance.id);
              },
            );
          });
        });
      },
    );

    it(
      'C389502 Check the JSON screen for imported multiple items with error in multiple holdings (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        let instanceHrid;
        const marcFileName = `C389502 multipleAutotestFileName.${getRandomPostfix()}`;
        const arrayOfHoldingsWithErrorsStatuses = [
          'Created (KU/CC/DI/M)',
          'Created (KU/CC/DI/A)',
          'Created (E)',
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.NO_ACTION,
        ];
        const quantityOfCreatedHoldings = 5;
        const quantityOfCreatedItems = 8;
        const quantityOfErrors = 5;
        const jsonHoldingsTestData = [
          'Import Log for Record 1 (Crossfire : a litany for survival : poems 1998-2019 / Staceyann Chin ; foreword by Jacqueline Woodson.)',
          'KU/CC/DI/M',
          'KU/CC/DI/A',
          'E',
          '{"key":"permanentLocationId","value":"fake"}',
          '{"key":"permanentLocationId","value":"null"}',
        ];
        const jsonItemTestData = [
          'Import Log for Record 1 (Crossfire : a litany for survival : poems 1998-2019 / Staceyann Chin ; foreword by Jacqueline Woodson.)',
          "Mapped Item is invalid: [Field 'materialType.id' is a required field and can not be null]",
          'ERROR: invalid input syntax for type uuid: "arch" (22P02)',
        ];

        // upload .mrc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(fileWithErrorsPathForUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.verifyMultipleHoldingsStatus(
          arrayOfHoldingsWithErrorsStatuses,
          quantityOfCreatedHoldings,
        );
        FileDetails.verifyMultipleItemsStatus(quantityOfCreatedItems);
        FileDetails.verifyMultipleErrorStatus(quantityOfErrors);
        FileDetails.verifyInstanceStatusIsHiperlink(RECORD_STATUSES.CREATED);
        // get items hrids for checking json page
        FileDetails.getItemHrids().then((hrids) => {
          const itemHrids = hrids;

          FileDetails.openJsonScreen(title);
          JsonScreenView.verifyJsonScreenIsOpened();
          // get Instance hrid for deleting
          JsonScreenView.getInstanceHrid().then((hrid) => {
            instanceHrid = hrid;

            JsonScreenView.openHoldingsTab();

            jsonHoldingsTestData.forEach((value) => JsonScreenView.verifyContentInTab(value));
            JsonScreenView.openItemTab();
            jsonItemTestData.forEach((value) => JsonScreenView.verifyContentInTab(value));
            itemHrids.forEach((value) => JsonScreenView.verifyContentInTab(value));

            cy.getAdminToken().then(() => {
              cy.getInstance({
                limit: 1,
                expandAll: true,
                query: `"hrid"=="${instanceHrid}"`,
              }).then((instance) => {
                instance.items.forEach((item) => cy.deleteItemViaApi(item.id));
                instance.holdings.forEach((holding) => cy.deleteHoldingRecordViaApi(holding.id));
                InventoryInstance.deleteInstanceViaApi(instance.id);
              });
            });
          });
        });
      },
    );

    it(
      'C388505 Check the log result table for imported multiple items in multiple holdings (folijet)',
      { tags: ['smoke', 'folijet', 'nonParallel'] },
      () => {
        const arrayOfHoldingsStatuses = [
          'Created (KU/CC/DI/M)',
          'Created (KU/CC/DI/A)',
          'Created (E)',
        ];
        const quantityOfCreatedItems = 6;
        const quantityOfCreatedHoldings = 3;
        const marcFileName = `C388505 autotestFileName.${getRandomPostfix()}`;

        // upload .mrc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(fileWioutErrorsPathForUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.verifyMultipleHoldingsStatus(
          arrayOfHoldingsStatuses,
          quantityOfCreatedHoldings,
        );
        FileDetails.verifyMultipleItemsStatus(quantityOfCreatedItems);

        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHRID = initialInstanceHrId;

          holdingsData.forEach((holdings) => {
            InventoryInstance.checkIsHoldingsCreated([`${holdings.permanentLocation} >`]);
            InventoryInstance.openHoldingsAccordion(`${holdings.permanentLocation} >`);
            InstanceRecordView.verifyQuantityOfItemsRelatedtoHoldings(
              holdings.permanentLocation,
              holdings.itemsQuqntity,
            );
          });

          cy.getAdminToken().then(() => {
            cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
              (instance) => {
                instance.items.forEach((item) => cy.deleteItemViaApi(item.id));
                instance.holdings.forEach((holding) => cy.deleteHoldingRecordViaApi(holding.id));
                InventoryInstance.deleteInstanceViaApi(instance.id);
              },
            );
          });
        });
      },
    );

    it(
      'C389587 Check the JSON screen for imported multiple items in multiple holdings (folijet)',
      { tags: ['smoke', 'folijet', 'nonParallel'] },
      () => {
        let instanceHrid;
        const arrayOfHoldingsStatuses = [
          'Created (KU/CC/DI/M)',
          'Created (KU/CC/DI/A)',
          'Created (E)',
        ];
        const quantityOfCreatedItems = 6;
        const quantityOfCreatedHoldings = 3;
        const marcFileName = `C389587 autotestFileName.${getRandomPostfix()}`;

        // upload .mrc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(fileWioutErrorsPathForUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.verifyMultipleHoldingsStatus(
          arrayOfHoldingsStatuses,
          quantityOfCreatedHoldings,
        );
        FileDetails.verifyMultipleItemsStatus(quantityOfCreatedItems);
        // get items hrids for checking json page
        FileDetails.getItemHrids().then((hrids) => {
          const itemHrids = hrids;

          FileDetails.openJsonScreen(title);
          JsonScreenView.verifyJsonScreenIsOpened();
          // get Instance hrid for deleting
          JsonScreenView.getInstanceHrid().then((hrid) => {
            instanceHrid = hrid;

            JsonScreenView.openHoldingsTab();
            ['KU/CC/DI/M', 'KU/CC/DI/A', 'E'].forEach((value) => JsonScreenView.verifyContentInTab(value));
            JsonScreenView.openItemTab();
            itemHrids.forEach((value) => JsonScreenView.verifyContentInTab(value));

            cy.getAdminToken().then(() => {
              cy.getInstance({
                limit: 1,
                expandAll: true,
                query: `"hrid"=="${instanceHrid}"`,
              }).then((instance) => {
                instance.items.forEach((item) => cy.deleteItemViaApi(item.id));
                instance.holdings.forEach((holding) => cy.deleteHoldingRecordViaApi(holding.id));
                InventoryInstance.deleteInstanceViaApi(instance.id);
              });
            });
          });
        });
      },
    );
  });
});
