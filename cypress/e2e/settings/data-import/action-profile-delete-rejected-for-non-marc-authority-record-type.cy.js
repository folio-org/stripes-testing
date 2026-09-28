import { PROFILE_TYPE_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
import ActionProfiles from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const actionProfileName = `AT_C1453730_ActionProfile_${getRandomPostfix()}`;
    const errorMessage =
      'Action profile with DELETE action is only allowed for MARC_AUTHORITY record type';
    const profileAction = 'DELETE';
    let mappingProfileId;

    before('Create prerequisite mapping profile', () => {
      cy.getAdminToken();
      // The linked mapping profile's own record type is irrelevant to the 422 rejection under
      // test (that's purely about the action profile's own action+folioRecord combination) -
      // reuse the already-proven default mapping profile instead of a bespoke one
      FieldMappingProfiles.createMappingProfileViaApi().then((response) => {
        mappingProfileId = response.body.id;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      FieldMappingProfiles.deleteMappingProfileByNameViaApi(
        FieldMappingProfiles.marcAuthorityUpdateMappingProfile.profile.name,
      );
      ActionProfiles.deleteActionProfileByNameViaApi(actionProfileName, { ignoreErrors: true });
    });

    it(
      'C1453730 Action profile creation is rejected when Delete action is used with non-MARC Authority record type (promin)',
      { tags: ['extendedPath', 'promin', 'C1453730'] },
      () => {
        // Step 1: POST an action profile with action=DELETE, folioRecord=MARC_BIBLIOGRAPHIC
        ActionProfiles.createActionProfileViaApi(
          {
            profile: {
              name: actionProfileName,
              description: '',
              action: profileAction,
              folioRecord: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            },
            addedRelations: [
              {
                masterProfileId: null,
                masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
                detailProfileId: mappingProfileId,
                detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
              },
            ],
            deletedRelations: [],
          },
          false,
        ).then((response) => {
          expect(response.status).to.eq(422);
          expect(response.body.errors[0].message).to.eq(errorMessage);
          expect(response.body.total_records).to.be.a('number');
        });

        // The action profile was not created
        ActionProfiles.getActionProfilesViaApi({ query: `name="${actionProfileName}"` }).then(
          ({ actionProfiles }) => {
            expect(actionProfiles).to.have.length(0);
          },
        );
      },
    );
  });
});
