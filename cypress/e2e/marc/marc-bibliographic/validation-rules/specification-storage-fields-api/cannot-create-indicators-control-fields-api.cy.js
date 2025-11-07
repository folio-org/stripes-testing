import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  generateTestFieldData,
} from '../../../../../support/api/specifications-helper';

describe('MARC Bibliographic Validation Rules - Cannot Create Indicators for 00X Control Fields API', () => {
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
  ];

  const TEST_CASE_ID = 'C494365';
  const CONTROL_FIELDS = [
    { tag: '002', expectedOrder: 1 },
    { tag: '004', expectedOrder: 2 },
    { tag: '009', expectedOrder: 1 },
  ];

  let user;
  let bibliographicSpec;
  const controlFieldMap = {}; // tag -> { id, tag }
  const createdFieldIds = []; // Track fields we create for cleanup

  before('Setup test data', () => {
    cy.getAdminToken();
    getBibliographicSpec().then((spec) => {
      bibliographicSpec = spec;

      cy.createTempUser(requiredPermissions).then((createdUser) => {
        user = createdUser;

        cy.getSpecificationFields(bibliographicSpec.id).then((fieldsResp) => {
          const fields = fieldsResp.body.fields || [];

          CONTROL_FIELDS.forEach(({ tag }) => {
            const match = fields.find((f) => f.tag === tag);
            if (match) {
              controlFieldMap[tag] = { id: match.id, tag: match.tag };
            }
          });

          // Create missing fields 002 and 004 (not 009 as it may be system managed)
          cy.then(() => {
            CONTROL_FIELDS.map(({ tag }) => tag).forEach((tag) => {
              if (!controlFieldMap[tag]) {
                const fieldData = generateTestFieldData(TEST_CASE_ID, {
                  tag,
                  label: `Control_Field_${tag}`,
                  scope: 'local',
                  repeatable: false,
                  required: false,
                });

                cy.createSpecificationField(bibliographicSpec.id, fieldData).then((createResp) => {
                  controlFieldMap[tag] = { id: createResp.body.id, tag };
                  createdFieldIds.push(createResp.body.id);
                });
              }
            });
          });
        });
      });
    });
  });

  after('Complete cleanup', () => {
    cy.getAdminToken();
    // Delete fields we created (002 and 004)
    createdFieldIds.forEach((fieldId) => {
      cy.deleteSpecificationField(fieldId, false);
    });

    // Delete temp user
    if (user?.userId) {
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C494365 Cannot create Indicators for local fields 002, 004, 009 of MARC bib spec (API) (spitfire)',
    { tags: ['extendedPath', 'C494365', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password).then(() => {
        CONTROL_FIELDS.forEach(({ tag, expectedOrder }) => {
          const indicatorPayload = {
            order: expectedOrder,
            label: `AT_${TEST_CASE_ID}_Ind_${expectedOrder}_name`,
          };
          cy.createSpecificationFieldIndicator(
            controlFieldMap[tag].id,
            indicatorPayload,
            false,
          ).then((resp) => {
            expect(resp.status, `Indicator creation should fail for control field ${tag}`).to.eq(
              400,
            );
            expect(resp.body).to.have.property('errors');
            const msg = resp.body?.errors[0]?.message;
            expect(msg).to.match(/Cannot define indicators for 00X control fields\./);
          });
        });
      });
    },
  );
});
