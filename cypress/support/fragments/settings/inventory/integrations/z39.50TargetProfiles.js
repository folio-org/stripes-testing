import { including } from '@interactors/html';
import {
  Button,
  TextField,
  Pane,
  Link,
  KeyValue,
  Selection,
  SelectionList,
  Select,
  MultiColumnListHeader,
  MultiColumnListRow,
  Callout,
} from '../../../../../../interactors';

const oclcWorldcatPane = Pane('✓ OCLC WorldCat');
const targetProfileName = Pane('Z39.50 target profiles');
const newPane = Pane('New');

const defaultCreateInstanceJobProfileName =
  'Inventory Single Record - Default Create Instance (d0ebb7b0-2f0f-11eb-adc1-0242ac120002)';
const defaultUpdateInstanceJobProfileName =
  'Inventory Single Record - Default Update Instance (91f9b8d6-d80e-4727-9783-73fb53e3c786)';
const linkTodefaultCreateInstanceJobProfile =
  '/settings/data-import/job-profiles/view/d0ebb7b0-2f0f-11eb-adc1-0242ac120002';
const linkTodefaultUpdateInstanceJobProfile =
  '/settings/data-import/job-profiles/view/91f9b8d6-d80e-4727-9783-73fb53e3c786';
const defaultCreateInstanceJobProfileId = 'd0ebb7b0-2f0f-11eb-adc1-0242ac120002';
const defaultUpdateInstanceJobProfileId = '91f9b8d6-d80e-4727-9783-73fb53e3c786';
const defaultCopyCatProfileId = 'f26df83c-aa25-40b6-876e-96852c3d4fd4';

function edit(profileName) {
  cy.do(Pane(profileName).find(Button('Edit')).click());
}
function save() {
  cy.do(Pane('OCLC WorldCat').find(Button('Save & close')).click());
}
function create() {
  cy.do(targetProfileName.find(Button('+ New')).click());
  cy.expect(newPane.exists());
}

function addJobProfileForCreate(profile = defaultCreateInstanceJobProfileName) {
  // wait until elements will be displayed on page
  cy.wait(2000);
  cy.do(Button('Add job profile for import/create').click());
  cy.wait(2000);
  cy.do([
    Selection({ singleValue: 'Select job profile for import/create' }).open(),
    SelectionList().select(profile),
  ]);
}
function addJobProfileForUpdate(profile = defaultUpdateInstanceJobProfileName) {
  cy.wait(2000);
  cy.do([
    Button('Add job profile for overlay/update').click(),
    Selection({ singleValue: 'Select job profile for overlay/update' }).open(),
    SelectionList().select(profile),
  ]);
}

function validateStringsAscendingOrder(prev) {
  const itemsClone = [...prev];

  itemsClone.sort((a, b) => {
    // when sorting move falsy values to the end and localeCompare truthy values
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  });

  expect(prev).to.deep.equal(itemsClone);
}

function verifyJobProfilesForImportCreateAscendingOrder() {
  // TODO need to wait until list will be uploaded
  cy.wait(2000);
  cy.get('div[class^="mclRowContainer--"]')
    .first()
    .then((elem) => {
      // get NodeList with rows content
      const jobProfileRows = elem[0].querySelectorAll('[data-row-index]');
      // put NodeList in the array
      const allJobProfiles = Array.prototype.slice.call(jobProfileRows);
      // detete default job profile from list
      allJobProfiles.shift();

      const rows = [];

      allJobProfiles.forEach((element) => rows.push(element.textContent));
      validateStringsAscendingOrder(rows);
    });
}

function verifyJobProfilesForOverlayUpdateAscendingOrder() {
  // TODO need to wait until list will be uploaded
  cy.wait(2000);
  cy.get('div[class^="mclRowContainer--"]')
    .last()
    .then((elem) => {
      // get NodeList with rows content
      const jobProfileRows = elem[0].querySelectorAll('[data-row-index]');
      // put NodeList in the array
      const allJobProfiles = Array.prototype.slice.call(jobProfileRows);
      // detete default job profile from list
      allJobProfiles.shift();

      const rows = [];

      allJobProfiles.forEach((element) => rows.push(element.textContent));
      validateStringsAscendingOrder(rows);
    });
}

export default {
  edit,
  save,
  create,
  addJobProfileForCreate,
  addJobProfileForUpdate,
  verifyJobProfilesForImportCreateAscendingOrder,
  verifyJobProfilesForOverlayUpdateAscendingOrder,
  changeOclcWorldCatToDefaultViaApi: () => {
    cy.okapiRequest({
      method: 'PUT',
      path: `copycat/profiles/${defaultCopyCatProfileId}`,
      body: {
        name: 'OCLC WorldCat',
        url: 'zcat.oclc.org/OLUCWorldCat',
        externalIdQueryMap: '@attr 1=1211 $identifier',
        internalIdEmbedPath: '999ff$i',
        createJobProfileId: defaultCreateInstanceJobProfileId,
        updateJobProfileId: defaultUpdateInstanceJobProfileId,
        targetOptions: { charset: 'utf-8' },
        externalIdentifierType: '439bfbae-75bc-4f74-9fc7-b2a2d47ce3ef',
        enabled: true,
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  changeOclcWorldCatValueViaApi: (value) => {
    cy.okapiRequest({
      method: 'PUT',
      path: `copycat/profiles/${defaultCopyCatProfileId}`,
      body: {
        name: 'OCLC WorldCat',
        url: 'zcat.oclc.org/OLUCWorldCat',
        externalIdQueryMap: '@attr 1=1211 $identifier',
        internalIdEmbedPath: '999ff$i',
        createJobProfileId: defaultCreateInstanceJobProfileId,
        updateJobProfileId: defaultUpdateInstanceJobProfileId,
        allowedCreateJobProfileIds: [defaultCreateInstanceJobProfileId],
        allowedUpdateJobProfileIds: [defaultUpdateInstanceJobProfileId],
        targetOptions: { charset: 'utf-8' },
        externalIdentifierType: '439bfbae-75bc-4f74-9fc7-b2a2d47ce3ef',
        enabled: true,
        authentication: value,
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  openTargetProfile: (id = defaultCopyCatProfileId) => {
    cy.wait(1500);
    cy.do(
      targetProfileName
        .find(Link({ href: including(`/settings/inventory/targetProfiles/${id}`) }))
        .click(),
    );
  },

  editOclcWorldCat: (auth, profileName) => {
    edit(profileName);
    addJobProfileForCreate();
    addJobProfileForUpdate();
    cy.do([
      TextField({ name: 'authentication' }).fillIn(auth),
      Select({ name: 'externalIdentifierType' }).choose('OCLC'),
    ]);
    save();
  },

  checkIsOclcWorldCatIsChanged: (auth) => cy.expect(oclcWorldcatPane.find(KeyValue({ value: auth }))),

  verifyTargetProfileFormOpened: () => cy.expect(targetProfileName.exists()),

  verifyTargetProfileForm() {
    cy.expect([
      KeyValue('Name').exists(),
      KeyValue('URL').exists(),
      KeyValue('Authentication').exists(),
      KeyValue('External ID query map').exists(),
      KeyValue('Internal ID embed path').exists(),
      MultiColumnListHeader({ id: 'create-job-profiles-list-column-id' }).exists(),
      MultiColumnListHeader({ id: 'update-job-profiles-list-column-id' }).exists(),
      KeyValue('Target options').exists(),
      KeyValue('External identifier type').exists(),
      KeyValue('Enabled').exists(),
    ]);
  },

  verifyCreateInstanceJobProfileList: (name) => {
    cy.expect(
      MultiColumnListRow({
        index: 0,
        content: including('Inventory Single Record - Default Create Instance'),
      }).exists(),
    );
    verifyJobProfilesForImportCreateAscendingOrder();
    cy.expect([
      MultiColumnListHeader('Job profiles for import/create').exists(),
      MultiColumnListHeader('Default').exists(),
    ]);
    // the job profile view is opened in a new tab but cypress can't work with tabs
    // check only the presence of a link for a job profile
    cy.expect(
      Pane(`✓ ${name}`)
        .find(Link({ href: including(linkTodefaultCreateInstanceJobProfile) }))
        .exists(),
    );
  },

  verifyUpdateInstanceJobProfileList: (name) => {
    cy.expect(
      MultiColumnListRow({
        index: 0,
        content: including('Inventory Single Record - Default Update Instance'),
      }).exists(),
    );
    verifyJobProfilesForOverlayUpdateAscendingOrder();
    cy.expect([
      MultiColumnListHeader('Job profiles for overlay/update').exists(),
      MultiColumnListHeader('Default').exists(),
    ]);
    // the job profile view is opened in a new tab but cypress can't work with tabs
    // check only the presence of a link for a job profile
    cy.expect(
      Pane(`✓ ${name}`)
        .find(Link({ href: including(linkTodefaultUpdateInstanceJobProfile) }))
        .exists(),
    );
  },

  verifyTargetProfileIsCreated: (name) => {
    cy.expect([
      newPane.absent(),
      Pane(`✕ ${name}`).exists(),
      Callout({ textContent: including('created') }).exists(),
    ]);
  },

  verifyTargetProfileIsUpdated: (name, newName) => {
    cy.expect([
      Pane(name).absent(),
      Pane(`✕ ${newName}`).exists(),
      Callout({ textContent: including('updated') }).exists(),
    ]);
  },

  getTargetProfileIdViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'copycat/profiles',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body.profiles[0].id;
      });
  },

  createNewZ3950TargetProfileViaApi: (name, createJobProfileIds = [], updateJobProfileIds = []) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'copycat/profiles',
        body: {
          name,
          url: 'zcat.oclc.org/OLUCWorldCat',
          authentication: '100481406/PAOLF',
          externalIdQueryMap: '@attr 1=1211 $identifier',
          internalIdEmbedPath: '999ff$i',
          createJobProfileId: defaultCreateInstanceJobProfileId,
          updateJobProfileId: defaultUpdateInstanceJobProfileId,
          allowedCreateJobProfileIds: [defaultCreateInstanceJobProfileId, ...createJobProfileIds],
          allowedUpdateJobProfileIds: [defaultUpdateInstanceJobProfileId, ...updateJobProfileIds],
          targetOptions: { charset: 'utf-8' },
          externalIdentifierType: '439bfbae-75bc-4f74-9fc7-b2a2d47ce3ef',
          enabled: true,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.id;
      });
  },

  deleteTargetProfileViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `copycat/profiles/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
};
