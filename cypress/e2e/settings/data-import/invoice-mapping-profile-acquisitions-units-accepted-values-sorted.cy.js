import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ArrayUtils from '../../../support/utils/arrays';

describe('Data Import', () => {
  describe('Settings', () => {
    const randomPostfix = getRandomPostfix();
    const namePrefix = 'C359163_';
    // Leading character alternates case across all 26 letters (a, B, c, D, ...) - satisfies the
    // precondition's "different letters in lowercase and uppercase"
    const acquisitionUnitNames = Array.from({ length: 26 }, (_, index) => {
      const letter = String.fromCharCode(97 + index);
      const casedLetter = index % 2 === 0 ? letter : letter.toUpperCase();
      return `${casedLetter}_${namePrefix}${randomPostfix}`;
    });

    let user;

    const deleteTestAcquisitionUnitsViaApi = () => {
      return AcquisitionUnits.getAcquisitionUnitViaApi({
        query: `name=="*${namePrefix}*"`,
      }).then(({ acquisitionsUnits }) => {
        acquisitionsUnits.forEach((unit) => {
          AcquisitionUnits.deleteAcquisitionUnitViaApi(unit.id, false);
        });
      });
    };

    before('Create acquisitions units and user', () => {
      cy.getAdminToken();
      deleteTestAcquisitionUnitsViaApi()
        .then(() => {
          acquisitionUnitNames.forEach((name) => {
            AcquisitionUnits.createAcquisitionUnitViaApi(
              AcquisitionUnits.getDefaultAcquisitionUnit({ name }),
            );
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.settingsDataImportEnabled.gui,
            Permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.login(user.username, user.password, {
              path: SettingsMenu.mappingProfilePath,
              waiter: FieldMappingProfiles.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      deleteTestAcquisitionUnitsViaApi();
    });

    it(
      "C359163 Invoice mapping profile: checking that the 'Accepted values' dropdown list contains all available units for the 'Acquisitions units' field (promin)",
      { tags: ['extendedPath', 'promin', 'C359163'] },
      () => {
        // Steps 1-2: Settings > Data import > Field mapping profiles > Actions > New field mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();

        // Step 3: Incoming record type: EDIFACT invoice, FOLIO record type: Invoice (not saving the profile)
        NewFieldMappingProfile.addIncomingRecordType(
          NewFieldMappingProfile.incomingRecordType.edifact,
        );
        NewFieldMappingProfile.addFolioRecordType(FOLIO_RECORD_TYPE.INVOICE);

        // Step 4: Open the "Acquisitions units" field's "Accepted values" dropdown
        NewFieldMappingProfile.openAcquisitionsUnitsAcceptedValues();

        // Step 5: the dropdown shows exactly the first 24 units, in alphabetical order
        NewFieldMappingProfile.getAcceptedValuesDropdownItems().then((items) => {
          acquisitionUnitNames.forEach((name) => {
            expect(items).to.include(name);
          });
          const isSorted = ArrayUtils.checkIsSortedAlphabetically({ array: items });
          cy.expect(isSorted, 'Acquisitions unit values sorted alphabetically').to.equal(true);
        });
      },
    );
  });
});
