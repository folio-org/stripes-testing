import {
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  FOLIO_RECORD_TYPE,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    before('Create user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C358992 Checking the disallows combinations in "invoice adjustments" option for invoice mapping profile (promin)',
      { tags: ['extendedPath', 'promin', 'C358992'] },
      () => {
        // Steps 1-2: Settings > Data import > Field mapping profiles > Actions > New;
        // set Incoming = EDIFACT invoice, FOLIO record type = Invoice
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.waitLoading();
        NewFieldMappingProfile.addIncomingRecordType(
          NewFieldMappingProfile.incomingRecordType.edifact,
        );
        NewFieldMappingProfile.addFolioRecordType(FOLIO_RECORD_TYPE.INVOICE);

        // Step 3: Scroll to invoice-level "Invoice adjustments" section and click "Add adjustment"
        NewFieldMappingProfile.addInvoiceLevelAdjustment();

        // Step 4: Set Pro rate = "Not prorated"
        NewFieldMappingProfile.openProRateAcceptedValues();
        NewFieldMappingProfile.selectAdjustmentAcceptedValue(ADJUSTMENT_PRORATE.NOT_PRORATED);

        // Step 5: Open Relation to total accepted values; verify only allowed combinations shown
        NewFieldMappingProfile.openRelationToTotalAcceptedValues();
        NewFieldMappingProfile.getAcceptedValuesDropdownItems().then((items) => {
          expect(items).to.include(ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO);
          expect(items).to.include(ADJUSTMENT_RELATION_TO_TOTAL.INCLUDED_IN);
          expect(items).not.to.include(ADJUSTMENT_RELATION_TO_TOTAL.SEPARATE_FROM);
        });
        NewFieldMappingProfile.closeAcceptedValuesDropdown();

        // Step 6: Clear Pro rate field
        NewFieldMappingProfile.clearProRateField();

        // Step 7: Set Relation to total = "Separate from"
        NewFieldMappingProfile.openRelationToTotalAcceptedValues();
        NewFieldMappingProfile.selectAdjustmentAcceptedValue(
          ADJUSTMENT_RELATION_TO_TOTAL.SEPARATE_FROM,
        );

        // Step 8: Open Pro rate accepted values; verify only allowed combinations shown
        NewFieldMappingProfile.openProRateAcceptedValues();
        NewFieldMappingProfile.getAcceptedValuesDropdownItems().then((items) => {
          expect(items).to.include(ADJUSTMENT_PRORATE.BY_LINE);
          expect(items).to.include(ADJUSTMENT_PRORATE.BY_AMOUNT);
          expect(items).to.include(ADJUSTMENT_PRORATE.BY_QUANTITY);
          expect(items).not.to.include(ADJUSTMENT_PRORATE.NOT_PRORATED);
        });
      },
    );
  });
});
