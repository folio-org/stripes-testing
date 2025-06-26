import { HTML, including } from '@interactors/html';
import {
  Button,
  Checkbox,
  EditableListRow,
  Modal,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiSelect,
  Pane,
  PaneSet,
  Spinner,
  TextField,
} from '../../../../../../interactors';

const readingRoomRecordCss = 'div[id=editList-reading-room-access-settings]';
const settingsHeaderIconCss = 'a[id=ModuleMainHeading]';
const tenantReadingRoomOptionCss = 'nav[data-test-nav-list] a[href$=tenant-settings]';
const readingRoomPaneCss = 'nav[data-test-nav-list] a[href$=reading-room]';
const readingRoomPane = PaneSet({ id: 'reading-room-access-settings' });
const newButton = Button({ id: 'clickable-add-reading-room-access-settings' });

const readingRoomName = 'Autotest_Room';
const recordLoadRetries = 10;
const recordLoadWait = 15000;

function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}

export default {
  readingRoomName,
  loadReadingRoomRecord() {
    let retries = 0;

    function verifyRecordLoad() {
      cy.get('body').then(($body) => {
        if ($body.find(readingRoomRecordCss).length === 0 && retries < recordLoadRetries) {
          cy.get(settingsHeaderIconCss).click();
          cy.get(tenantReadingRoomOptionCss).click();
          cy.get(readingRoomPaneCss).click();
          cy.expect(Pane('Reading room access').exists());
          cy.expect(Spinner().exists());
          cy.expect(Spinner().absent());
          cy.wait(recordLoadWait);
          cy.then(() => {
            retries++;
          });
          verifyRecordLoad();
        }
      });
    }
    verifyRecordLoad();
  },
  createReadingRoomViaApi(
    servicePointId,
    servicePointName,
    readingRoomId,
    publicState = true,
    roomName = readingRoomName,
  ) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'reading-room',
      body: {
        isPublic: publicState,
        name: roomName,
        servicePoints: [
          {
            value: servicePointId,
            label: servicePointName,
          },
        ],
        id: readingRoomId,
      },
      isDefaultSearchParamsRequired: false,
    });
  },
  deleteReadingRoomViaApi(readingRoomId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `reading-room/${readingRoomId}`,
    });
  },
  create(readingRoom) {
    cy.wait(1000);
    cy.do([
      newButton.click(),
      readingRoomPane.find(TextField({ placeholder: 'Room name' })).fillIn(readingRoom.name),
    ]);
    cy.wait(2000);
    cy.do(
      readingRoomPane
        .find(MultiSelect({ id: 'rra-service-point' }))
        .choose(readingRoom.servicePointName),
    );
    cy.wait(2000);
    cy.get('input[aria-label="Public 0"]').then(($checkbox) => {
      if (!$checkbox.is(':checked')) {
        cy.wrap($checkbox).click();
      }
    });
    cy.wait(2000);
    cy.do(
      readingRoomPane.find(Button({ id: 'clickable-save-reading-room-access-settings-0' })).click(),
    );
    cy.wait(2000);
    cy.expect(readingRoomPane.find(HTML(including(readingRoom.name))).exists());
  },
  edit(name) {
    cy.do(
      MultiColumnListCell({ content: name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'edit' }))
            .click(),
        );
        cy.wait(1000);
        cy.do(
          getEditableListRow(rowNumber)
            .find(Checkbox({ ariaLabel: `Public ${rowNumber.split('-')[1]}` }))
            .click(),
        );
      }),
    );
    cy.do(Button('Save').click());
    cy.expect(readingRoomPane.find(HTML(including(name))).exists());
  },
  delete(name) {
    cy.do(
      MultiColumnListCell({ content: name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'trash' }))
            .click(),
        );
      }),
    );
    cy.do(
      Modal({ id: 'delete-controlled-vocab-entry-confirmation' })
        .find(Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' }))
        .click(),
    );
    cy.expect(readingRoomPane.find(HTML(including(name))).absent());
  },
  verifyColumns() {
    cy.expect([
      MultiColumnListHeader('Room name*').exists(),
      MultiColumnListHeader('Public').exists(),
      MultiColumnListHeader('Associated service points*').exists(),
    ]);
  },
  verifyActionsButtonAbsent() {
    cy.expect(Button('Actions').absent());
  },
  verifyNewButtonAbsent() {
    cy.expect(Button('New').absent());
  },
  verifyPublicCheckboxIsDisabled(roomName) {
    cy.do(
      Pane('Reading room access')
        .find(MultiColumnListCell({ content: roomName }))
        .perform((element) => {
          const rowNumber = element.parentElement.parentElement
            .getAttribute('data-row-index')
            .split('-')[1];

          cy.get('div[class^="mclRowFormatterContainer-"]')
            .eq(rowNumber)
            .find('input[type="checkbox"]')
            .should('not.have.prop', 'checked', true);
        }),
    );
  },
  verifyReadingRoomPaneExists() {
    cy.expect(readingRoomPane.exists());
  },
};
