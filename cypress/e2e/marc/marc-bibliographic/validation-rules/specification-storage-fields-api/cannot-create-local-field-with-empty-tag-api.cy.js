/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field with Empty Tag API', () => {
  // User with both GET and POST permissions to create fields (but validation should prevent invalid requests)
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  let user;
  let bibSpecId;

  const baseFieldPayload = {
    label: 'AT_C490921_Custom Field - Contributor Data',
    url: 'http://www.example.org/field100.html',
    repeatable: true,
    required: false,
  };

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
      });
    });
  });

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490921 Cannot create Local Field with empty "tag" for MARC bib spec (API) (spitfire)',
    { tags: ['C490921', 'extendedPath', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Test with missing "tag" field
      const payloadWithoutTag = { ...baseFieldPayload };

      cy.createSpecificationField(bibSpecId, payloadWithoutTag, false).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.errors).to.exist;
        expect(response.body.errors).to.have.length.greaterThan(0);

        // Check for the specific error message about missing tag field
        const errorMessages = response.body.errors.map((error) => error.message);
        expect(errorMessages.some((msg) => msg.includes("The 'tag' field is required"))).to.be.true;
      });

      // Step 2: Test with empty "tag" field
      const payloadWithEmptyTag = {
        ...baseFieldPayload,
        tag: '',
      };

      cy.createSpecificationField(bibSpecId, payloadWithEmptyTag, false).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.errors).to.exist;
        expect(response.body.errors).to.have.length.greaterThan(0);

        // Check for the specific error messages about empty tag field
        const errorMessages = response.body.errors.map((error) => error.message);
        expect(
          errorMessages.some((msg) => msg.includes(
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
          )),
        ).to.be.true;
        expect(errorMessages.some((msg) => msg.includes("The 'tag' field is required"))).to.be.true;
      });
    },
  );
});
