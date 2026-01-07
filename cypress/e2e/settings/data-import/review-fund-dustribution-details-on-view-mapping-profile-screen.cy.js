import {
  ACQUISITION_METHOD_NAMES,
  FOLIO_RECORD_TYPE,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileEdit from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileEditForm';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/generateTextCode';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const currencyType = '€';
    const percentageType = '%';
    const mappingProfile = {
      name: `C380563 fund details ${getRandomStringCode(50)}`,
      incomingRecordType: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      vendor: VENDOR_NAMES.GOBI,
      title: '245$a',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
      currency: 'EUR',
      receivingWorkflow: 'Synchronized',
      physicalUnitPrice: '"20"',
      quantityPhysical: '"1"',
      fundId: '"African History (AFRICAHIST)"',
      expenseClass: '"Print (Prn)"',
      value: '100',
    };

    before('Create test user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C380563 Order field mapping: verify the fund % and currency details on the view screen (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C380563'] },
      () => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillOrderMappingProfile(mappingProfile);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyFundDistributionValue(
          ` "${mappingProfile.value}"${percentageType} `,
        );
        FieldMappingProfileView.edit();
        NewFieldMappingProfile.selectFundDistributionType(currencyType);
        FieldMappingProfileEdit.save();
        FieldMappingProfileView.verifyMappingProfileOpened();
        FieldMappingProfileView.verifyFundDistributionValue(
          ` "${mappingProfile.value}"${currencyType} `,
        );
      },
    );
  });
});
