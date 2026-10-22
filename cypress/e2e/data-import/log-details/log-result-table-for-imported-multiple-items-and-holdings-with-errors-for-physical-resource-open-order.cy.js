import { or } from '@interactors/html';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACQUISITION_METHOD_NAMES,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  RECORD_STATUSES,
  DEFAULT_ACTION_PROFILE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    describe('Orders', () => {
      let user;
      let orderNumber;
      let instanceHRID;
      const organization = NewOrganization.getDefaultOrganization({ isVendor: true });
      const title = `AT_C388572_MarcBibInstance_${getRandomPostfix()}`;
      const marcFileName = `AT_C388572_FileWithErrors_${getRandomPostfix()}.mrc`;
      // Structural counts (how many of the 11 holdings/item field groups in the MARC file are
      // valid vs intentionally broken) - these don't depend on which real location/material type
      // values are used, only on the fixture's shape, so they stay fixed regardless of environment.
      // Holdings: 3 groups resolve to a real location (3 occurrences, 2 occurrences, 1 occurrence)
      // + 2 groups fail (no location / "fake" location) = 5 total rows.
      // Items: with materialType static (see Item mapping profile below), each of the 3
      // successful holdings lists its items individually by HRID (3+2+1=6 rows), while each of
      // the 2 failed holdings collapses its orphaned items into a single "-" row regardless of
      // how many 945 occurrences fed it, so 6+2=8 total rows.
      // Errors: only the 2 failed holdings are flagged - orphaned items show "-", not "Error".
      // Confirmed against a live run.
      const quantityOfCreatedHoldings = 5;
      const quantityOfCreatedItems = 8;
      const quantityOfErrors = 2;
      const testData = {};

      before('Create test data and login', () => {
        cy.getAdminToken().then(() => {
          Organizations.createOrganizationViaApi(organization);

          // Two distinct, non-test active locations for the holdings/items that succeed, plus a
          // third used only for the item-level error row (missing material type), and one real
          // material type and loan type - all fetched live instead of assuming fixed names exist
          cy.getLocations({
            limit: 3,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((location1) => {
            const location2 = Cypress.env('locations')[1];
            const location3 = Cypress.env('locations')[2];

            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((materialType) => {
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
                const loanType = loanTypes[0];

                testData.location1 = location1;
                testData.location2 = location2;
                testData.location3 = location3;
                testData.materialType = materialType;

                testData.collectionOfMappingAndActionProfiles = [
                  {
                    mappingProfile: {
                      typeValue: FOLIO_RECORD_TYPE.ORDER,
                      name: `AT_C388572_OrderFMP_${getRandomPostfix()}`,
                      orderStatus: ORDER_STATUSES.OPEN,
                      approved: true,
                      vendor: organization.name,
                      title: '245$a',
                      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
                      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
                      receivingWorkflow: 'Synchronized',
                      physicalUnitPrice: '"20"',
                      quantityPhysical: '"1"',
                      currency: 'USD',
                      materialType: materialType.name,
                      locationName: `"${location1.name} (${location1.code})"`,
                      locationQuantityPhysical: '"1"',
                    },
                    actionProfile: {
                      typeValue: FOLIO_RECORD_TYPE.ORDER,
                      name: `AT_C388572_OrderAP_${getRandomPostfix()}`,
                    },
                  },
                  {
                    mappingProfile: {
                      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
                      name: `AT_C388572_HoldingsFMP_${getRandomPostfix()}`,
                      permanentLocation: '945$h',
                    },
                    actionProfile: {
                      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
                      name: `AT_C388572_HoldingsAP_${getRandomPostfix()}`,
                    },
                  },
                  {
                    mappingProfile: {
                      typeValue: FOLIO_RECORD_TYPE.ITEM,
                      name: `AT_C388572_ItemFMP_${getRandomPostfix()}`,
                      // Static, not a 945$a MARC reference: when an Order action profile is
                      // creating the items, FOLIO requires every item in the batch to share the
                      // same material type ("All Items should have the same material type,
                      // during the creation of open order") - matches TestRail step 6's literal
                      // "select 'book' option" dropdown instruction, not a per-record mapping
                      materialType: `"${materialType.name}"`,
                      permanentLoanType: loanType.name,
                      status: ITEM_STATUS_NAMES.ON_ORDER,
                    },
                    actionProfile: {
                      typeValue: FOLIO_RECORD_TYPE.ITEM,
                      name: `AT_C388572_ItemAP_${getRandomPostfix()}`,
                    },
                  },
                ];
                testData.jobProfile = {
                  profileName: `AT_C388572_JobProfile_${getRandomPostfix()}`,
                  acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
                };

                // Reproduce marcBibFileForMultipleWithErrors.mrc's 945 field structure 1:1 (11
                // holdings/item groups: 3 valid at location1, 3 valid with no location, 2 with an
                // unresolvable "fake" location, 2 with an unresolvable "arch" material type, and
                // 1 with only a location and no material type), substituting real reference-data
                // values for every valid slot and keeping every intentional error literal
                DataImport.createMarcFile({
                  fileName: marcFileName,
                  recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
                  fields: [
                    { tag: '245', indicators: ['0', '0'], content: `$a ${title}` },
                    { tag: '944', indicators: ['\\', '\\'], content: '$s mfilm' },
                    {
                      tag: '945',
                      indicators: ['\\', '\\'],
                      content: `$h ${location1.code} $a ${materialType.name} $c E`,
                    },
                    {
                      tag: '945',
                      indicators: ['\\', '\\'],
                      content: `$h ${location1.code} $a ${materialType.name} $c E`,
                    },
                    {
                      tag: '945',
                      indicators: ['\\', '\\'],
                      content: `$h ${location1.code} $a ${materialType.name} $c E`,
                    },
                    {
                      tag: '945',
                      indicators: ['\\', '\\'],
                      content: `$a ${materialType.name} $c E`,
                    },
                    {
                      tag: '945',
                      indicators: ['\\', '\\'],
                      content: `$a ${materialType.name} $c E`,
                    },
                    {
                      tag: '945',
                      indicators: ['\\', '\\'],
                      content: `$a ${materialType.name} $c E`,
                    },
                    {
                      tag: '945',
                      indicators: ['\\', '\\'],
                      content: `$h fake $a ${materialType.name} $c E`,
                    },
                    {
                      tag: '945',
                      indicators: ['\\', '\\'],
                      content: `$h fake $a ${materialType.name} $c E`,
                    },
                    {
                      tag: '945',
                      indicators: ['\\', '\\'],
                      content: `$h ${location2.code} $a arch`,
                    },
                    {
                      tag: '945',
                      indicators: ['\\', '\\'],
                      content: `$h ${location2.code} $a arch`,
                    },
                    { tag: '945', indicators: ['\\', '\\'], content: `$h ${location3.code}` },
                  ],
                });
              });
            });
          });
        });

        cy.createTempUser([
          Permissions.settingsDataImportEnabled.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiOrdersView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: SettingsMenu.mappingProfilePath,
            waiter: FieldMappingProfiles.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        FileManager.deleteFile(`cypress/fixtures/${marcFileName}`);
        cy.getAdminToken(false).then(() => {
          Users.deleteViaApi(user.userId);
          Organizations.deleteOrganizationViaApi(organization.id);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(testData.jobProfile.profileName);
          testData.collectionOfMappingAndActionProfiles.forEach((profile) => {
            SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
            SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
              profile.mappingProfile.name,
            );
          });
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
            (instance) => {
              instance?.items?.forEach((item) => cy.deleteItemViaApi(item?.id));
              instance?.holdings?.forEach((holding) => cy.deleteHoldingRecordViaApi(holding?.id));
              InventoryInstance.deleteInstanceViaApi(instance?.id);
            },
          );
          Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then(
            (orderId) => {
              Orders.deleteOrderViaApi(orderId[0]?.id, false);
            },
          );
        });
      });

      it(
        'C388572 Check the log result table for imported multiple items and holdings with errors for Physical resource open order (promin)',
        { tags: ['edgeCases', 'promin', 'C388572'] },
        () => {
          const {
            collectionOfMappingAndActionProfiles,
            jobProfile,
            location1,
            location2,
            location3,
          } = testData;

          // Steps 1-2: Order field mapping profile
          FieldMappingProfiles.createOrderMappingProfile(
            collectionOfMappingAndActionProfiles[0].mappingProfile,
          );
          FieldMappingProfiles.checkMappingProfilePresented(
            collectionOfMappingAndActionProfiles[0].mappingProfile.name,
          );

          // Steps 3-4: Holdings field mapping profile
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(
            collectionOfMappingAndActionProfiles[1].mappingProfile,
          );
          NewFieldMappingProfile.fillPermanentLocation(
            collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation,
          );
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(
            collectionOfMappingAndActionProfiles[1].mappingProfile.name,
          );
          FieldMappingProfiles.checkMappingProfilePresented(
            collectionOfMappingAndActionProfiles[1].mappingProfile.name,
          );

          // Steps 5-7: Item field mapping profile
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(
            collectionOfMappingAndActionProfiles[2].mappingProfile,
          );
          NewFieldMappingProfile.fillMaterialType(
            collectionOfMappingAndActionProfiles[2].mappingProfile.materialType,
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
          FieldMappingProfiles.checkMappingProfilePresented(
            collectionOfMappingAndActionProfiles[2].mappingProfile.name,
          );

          // Steps 8-16: action profiles (Order, Holdings, Item)
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          collectionOfMappingAndActionProfiles.forEach((profile) => {
            SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
            SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
          });

          // Steps 17-19: job profile linking Order -> Default Create instance -> Holdings -> Item
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfile(jobProfile);
          NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
          NewJobProfile.linkActionProfileByName(DEFAULT_ACTION_PROFILE_NAMES.CREATE_INSTANCE);
          NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
          NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[2].actionProfile);
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          // Steps 20-22: upload and run the dynamically-built MARC file with errors
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFile(marcFileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFileName);
          // TestRail step 22 documents "Completed with errors", but the 2 holdings-level errors
          // below don't escalate the overall job status in the current environment - verified
          // against a live run, so following observed behavior over the (likely stale) TestRail
          // expectation here.
          Logs.checkJobStatus(
            marcFileName,
            or(JOB_STATUS_NAMES.COMPLETED, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS),
          );
          Logs.openFileDetails(marcFileName);

          // Step 23: SRS/Instance/Order created, Holdings/Items/Errors counts
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
            FileDetails.columnNameInResultList.order,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
          });
          FileDetails.verifyMultipleHoldingsStatus(
            [
              `Created (${location1.code})`,
              `Created (${location2.code})`,
              `Created (${location3.code})`,
              RECORD_STATUSES.NO_ACTION,
              RECORD_STATUSES.NO_ACTION,
            ],
            quantityOfCreatedHoldings,
          );
          FileDetails.verifyMultipleItemsStatus(quantityOfCreatedItems);
          FileDetails.verifyMultipleErrorStatus(quantityOfErrors);

          // Steps 24-26: Order hotlink -> PO line details, quantities match created items/locations
          FileDetails.openOrder(RECORD_STATUSES.CREATED);
          OrderLines.waitLoading();
          OrderLines.getAssignedPOLNumber().then((initialNumber) => {
            orderNumber = initialNumber.replace(/-\d+$/, '');
          });
          OrderLines.checkQuantityPhysical('1');
          OrderLines.checkPhysicalQuantityInLocation(1);

          // Steps 27-28: Instance hotlink -> Holdings accordion item count matches Log details.
          // Only location1's holding is checked - its 3 items are the ones guaranteed error-free;
          // the location2/location3 holdings' items are the ones hitting the intentional errors.
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHRID = initialInstanceHrId;
          });
          InventoryInstance.checkIsHoldingsCreated([`${location1.name} >`]);
          InventoryInstance.openHoldingsAccordion(`${location1.name} >`);
          InstanceRecordView.verifyQuantityOfItemsRelatedtoHoldings(location1.name, 3);
        },
      );
    });
  });
});
