import {
  FOLIO_RECORD_TYPE,
  ORDER_STATUSES,
  VENDOR_NAMES,
  ACQUISITION_METHOD_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_PAYMENT_STATUS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/genereteTextCode';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C378898 dropdown items ${getRandomStringCode(50)}`,
      incomingRecordType: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
      currency: 'USD',
      receivingWorkflow: 'Synchronized',
    };

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      });
    });

    it(
      'C378898 Order field mapping profile: fix the values in the "Payment status" field (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfile);
        NewFieldMappingProfile.verifyPaymentStatusDropdownOptions(
          ORDER_PAYMENT_STATUS.PENDING,
          ORDER_PAYMENT_STATUS.PAYMENT_NOT_REQUIRED,
        );
        NewFieldMappingProfile.selectPaymentStatusFromDropdown(
          ORDER_PAYMENT_STATUS.PAYMENT_NOT_REQUIRED,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyPaymentStatus('"Payment Not Required"');
      },
    );
  });
});
