import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACQUISITION_METHOD_NAMES,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  NO_BARCODE,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  RECORD_STATUSES,
  VENDOR_NAMES,
  INVENTORY_ITEMS,
  UUID_V4_PATTERN,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import OrderLines from '../../../support/fragments/orders/orderLines';
import {
  ActionProfiles,
  FieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import { CURRENCIES } from '../../../support/fragments/settings/tenant/general/localization';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../support/utils';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  const flow = new ExecutionFlowManager();
  const R = { USER: 'user', LOCALE: 'locale', ORDER: 'order', INSTANCE: 'instance' };
  const postfix = getRandomPostfix();
  const fileName = `C451597_Item_fields_with_order_${postfix}.mrc`;
  const filePath = 'marcFileForC451597.mrc';
  const instanceTitle = 'Quiet time.';
  const expectedEnumeration = 'v.1';
  const MARC_FIELDS = {
    TITLE: '245$a',
    ENUMERATION: '980$n',
  };
  const DEFAULT_CREATE_INSTANCE_PROFILE = 'Default - Create instance';
  const MAPPING_RECEIVING_WORKFLOW = 'Synchronized';
  const ORDER_MAPPING_VALUES = {
    PHYSICAL_UNIT_PRICE: '"20"',
    QUANTITY_PHYSICAL: '"1"',
    COPY_NUMBER: '"c.1"',
    DISPLAYED_COPY_NUMBER: 'c.1',
  };
  const orderProfile = {
    typeValue: FOLIO_RECORD_TYPE.ORDER,
    name: `C451597 Create physical order ${postfix}`,
    orderStatus: ORDER_STATUSES.OPEN,
    approved: true,
    vendor: VENDOR_NAMES.GOBI,
    title: MARC_FIELDS.TITLE,
    acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
    orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
    receivingWorkflow: MAPPING_RECEIVING_WORKFLOW,
    physicalUnitPrice: ORDER_MAPPING_VALUES.PHYSICAL_UNIT_PRICE,
    quantityPhysical: ORDER_MAPPING_VALUES.QUANTITY_PHYSICAL,
    currency: CURRENCIES.US_DOLLAR.value,
    materialType: MATERIAL_TYPE_NAMES.BOOK,
    locationName: `"${LOCATION_NAMES.ANNEX}"`,
    locationQuantityPhysical: '"1"',
  };
  const holdingsProfile = {
    typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
    name: `C451597 Create simple holdings ${postfix}`,
    permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
  };
  const itemProfile = {
    typeValue: FOLIO_RECORD_TYPE.ITEM,
    name: `C451597 Create simple item ${postfix}`,
    materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
    permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
    status: ITEM_STATUS_NAMES.ON_ORDER,
    copyNumber: ORDER_MAPPING_VALUES.COPY_NUMBER,
    enumeration: MARC_FIELDS.ENUMERATION,
  };
  const mappings = [orderProfile, holdingsProfile, itemProfile];
  const actions = mappings.map((mapping) => ({
    typeValue: mapping.typeValue,
    name: mapping.name,
  }));
  const jobProfile = {
    profileName: `C451597 Create order with inventory ${postfix}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
  };

  before(() => {
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => {
      flow.set(R.LOCALE, locale);
    });
    cy.createTempUser([
      Permissions.settingsDataImportEnabled.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiOrganizationsView.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiOrdersView.gui,
    ]).then((user) => {
      flow.set(R.USER, user, (value) => Users.deleteViaApi(value.userId));
      cy.login(user.username, user.password, {
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
    actions.forEach(({ name }) => ActionProfiles.deleteActionProfileByNameViaApi(name, { ignoreErrors: true }));
    mappings.forEach(({ name }) => FieldMappingProfiles.deleteMappingProfileByNameViaApi(name, true));
    flow.cleanup();
  });

  it(
    'C451597 Checking of item fields for item created with order',
    { tags: ['extendedPath', 'thunderjet', 'C451597'] },
    () => {
      cy.log('Step 1. Open the New field mapping profile form for the order mapping profile');
      FieldMappingProfiles.openNewMappingProfileForm();

      cy.log('Step 2. Populate the order mapping profile fields');
      NewFieldMappingProfile.fillOrderMappingProfile(
        { ...orderProfile },
        { skipLocation: true, useFirstVendorResult: true },
      );

      cy.log('Step 3. Add an Annex location with physical quantity 1');
      NewFieldMappingProfile.addLocation(orderProfile);

      cy.log('Step 4. Save the order mapping profile');
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(orderProfile.name);

      cy.log('Step 5. Open the New field mapping profile form for the holdings mapping profile');
      FieldMappingProfiles.openNewMappingProfileForm();

      cy.log('Step 6. Populate the holdings mapping profile fields');
      NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsProfile);
      NewFieldMappingProfile.fillPermanentLocation(holdingsProfile.permanentLocation);

      cy.log('Step 7. Save the holdings mapping profile');
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(holdingsProfile.name);

      cy.log(
        'Step 8. Check for an existing simple item mapping profile and open the form when it is not available',
      );
      FieldMappingProfiles.openNewMappingProfileForm();

      cy.log('Step 9. Populate the item mapping profile fields');
      NewFieldMappingProfile.fillSummaryInMappingProfile(itemProfile);
      NewFieldMappingProfile.fillMaterialType(itemProfile.materialType);
      NewFieldMappingProfile.fillPermanentLoanType(itemProfile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(`"${itemProfile.status}"`);
      NewFieldMappingProfile.fillCopyNumber(itemProfile.copyNumber);
      NewFieldMappingProfile.fillEnumeration(itemProfile.enumeration);

      cy.log('Step 10. Save the item mapping profile');
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(itemProfile.name);

      FieldMappingProfiles.checkMappingProfilePresented(itemProfile.name);

      cy.log('Step 11. Open the action profiles settings tab and the new action profile form');
      SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
      ActionProfiles.openNewActionProfileForm();

      cy.log('Step 12. Populate the order action profile');
      NewActionProfile.fill(actions[0]);

      cy.log('Step 13. Save the order action profile');
      NewActionProfile.linkMappingProfile(mappings[0].name);
      ActionProfiles.checkActionProfilePresented(actions[0].name);

      cy.log('Step 14. Open the new holdings action profile form');
      ActionProfiles.openNewActionProfileForm();

      cy.log('Step 15. Populate the holdings action profile');
      NewActionProfile.fill(actions[1]);

      cy.log('Step 16. Save the holdings action profile');
      NewActionProfile.linkMappingProfile(mappings[1].name);
      ActionProfiles.checkActionProfilePresented(actions[1].name);

      cy.log('Step 17. Open the new item action profile form');
      ActionProfiles.openNewActionProfileForm();

      cy.log('Step 18. Populate the item action profile');
      NewActionProfile.fill(actions[2]);

      cy.log('Step 19. Save the item action profile');
      NewActionProfile.linkMappingProfile(mappings[2].name);

      cy.log('Step 20. Open the job profiles settings tab and the new job profile form');
      SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
      JobProfiles.createJobProfile(jobProfile);

      cy.log(
        'Step 21. Populate the job profile and link the action profiles in the required sequence',
      );
      NewJobProfile.linkActionProfile(actions[0]);
      NewJobProfile.linkActionProfileByName(DEFAULT_CREATE_INSTANCE_PROFILE);
      NewJobProfile.linkActionProfile(actions[1]);
      NewJobProfile.linkActionProfile(actions[2]);

      cy.log('Step 22. Save the job profile');
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      cy.log('Step 23. Upload the MARC file');
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePath, fileName);
      JobProfiles.waitFileIsUploaded();

      cy.log('Step 24. Run the created job profile');
      JobProfiles.search(jobProfile.profileName);
      JobProfiles.runImportFile();

      cy.log('Step 25. Verify completed import and created records');
      Logs.waitFileIsImported(fileName);
      Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(fileName);
      [
        FileDetails.columnNameInResultList.instance,
        FileDetails.columnNameInResultList.holdings,
        FileDetails.columnNameInResultList.item,
        FileDetails.columnNameInResultList.order,
      ].forEach((column) => FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, column));

      cy.log('Step 26. Open the created order hotlink');
      cy.intercept('GET', new RegExp(String.raw`\/orders/order-lines\/${UUID_V4_PATTERN}`)).as(
        'createdOrderLine',
      );
      FileDetails.openOrder(RECORD_STATUSES.CREATED);
      OrderLines.waitLoading();

      cy.log('Step 27. Verify Create inventory is Instance, Holding, Item');
      OrderLines.checkCreatedInventoryInPhysicalRecourceDetails(
        POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
      );

      cy.log('Step 28. Open the created instance and verify its POL hotlink');
      OrderLines.openLinkedInstance();
      InstanceRecordView.verifyInstanceIsOpened(instanceTitle);

      let poLineNumber;

      cy.wait('@createdOrderLine').then(({ response }) => {
        poLineNumber = response.body.poLineNumber;

        InstanceRecordView.openAcquisitionAccordion();
        InstanceRecordView.verifyHotlinkToPOL(poLineNumber);

        cy.log('Step 29. Verify one holdings record exists for the instance');
        InstanceRecordView.verifyIsHoldingsCreated([`${LOCATION_NAMES.ANNEX_UI} >`]);

        cy.log('Step 30. Open the holdings record');
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.checkHoldingRecordViewOpened();
        HoldingsRecordView.close();

        cy.log(
          'Step 31. Open the created item and verify copy number, enumeration, and POL hotlink',
        );
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.ANNEX_UI} >`);
        InventoryInstance.openItemByBarcode(NO_BARCODE);
        ItemRecordView.waitLoading();
        ItemRecordView.checkHotlinksToCreatedPOL(poLineNumber);
        ItemRecordView.checkItemRecordDetails({
          enumerationData: [
            { label: INVENTORY_ITEMS.ENUMERATION, conditions: { value: expectedEnumeration } },
          ],
          itemData: [
            {
              label: INVENTORY_ITEMS.COPY_NUMBER,
              conditions: { value: ORDER_MAPPING_VALUES.DISPLAYED_COPY_NUMBER },
            },
          ],
        });
      });
    },
  );
});
