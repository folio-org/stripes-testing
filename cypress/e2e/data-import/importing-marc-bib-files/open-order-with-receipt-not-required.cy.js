import {
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  VENDOR_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import OrderLineDetails from '../../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../../support/fragments/orders/orderLines';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import Orders from '../../../support/fragments/orders/orders';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let orderNumber;
    const filePathForCreateOrder = 'marcBibFileForC380389.mrc';
    const marcFileName = `C380389 autotest file ${getRandomPostfix()}`;

    const mappingProfile = {
      name: `C380389 Create order - receipt not required${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.OPEN,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      publicationDate: '264$c; else 260$c',
      publisher: '264$b; else 260$b',
      internalNote: '981$d',
      acquisitionMethod: 'Approval Plan',
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.ELECTRONIC_RESOURCE,
      receiptStatus: 'Receipt Not Required',
      paymentStatus: 'Pending',
      selector: '981$e',
      rush: '981$h',
      receivingWorkflow: 'Synchronized',
      accountNumber: '981$g',
      instructionsToVendor: '981$f',
      electronicUnitPrice: '980$b',
      quantityElectronic: '980$g',
      currency: 'USD',
      contributor: '100$a',
      contributorType: 'Personal name',
      productId: '020$a',
      qualifier: '020$q',
      productIDType: 'ISBN',
      vendorReferenceNumber: '980$f',
      vendorReferenceType: 'Vendor order reference number',
      locationName: '049$a',
      locationQuantityElectronic: '980$g',
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      name: `C380389 Create order - receipt not required${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C380389 Create order - receipt not required${getRandomPostfix()}`,
    };

    before('create test data', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        JobProfiles.deleteJobProfile(jobProfile.profileName);
        ActionProfiles.deleteActionProfile(actionProfile.name);
        FieldMappingProfileView.deleteViaApi(mappingProfile.name);
        Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then((orderId) => {
          Orders.deleteOrderViaApi(orderId[0].id);
        });
      });
    });

    it(
      'C380389 Creating an open order with Receipt not required (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // create mapping profile
        FieldMappingProfiles.createOrderMappingProfile(mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateOrder, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.openOrder(RECORD_STATUSES.CREATED);
        OrderLines.waitLoading();
        OrderLines.getAssignedPOLNumber().then((initialNumber) => {
          orderNumber = initialNumber.replace('-1', '');
        });
        OrderLineDetails.checkOrderLineDetails({
          purchaseOrderLineInformation: [{ key: 'Receipt status', value: 'Receipt Not Required' }],
        });
      },
    );
  });
});
