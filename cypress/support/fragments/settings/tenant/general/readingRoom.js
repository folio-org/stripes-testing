import {
  Button,
  MultiColumnListHeader,
  Pane,
  Spinner,
  MultiColumnListCell,
  MultiColumnListRow,
  Checkbox,
} from '../../../../../../interactors';

const readingRoomRecordCss = 'div[id=editList-reading-room-access-settings]';
const settingsHeaderIconCss = 'a[id=ModuleMainHeading]';
const tenantReadingRoomOptionCss = 'nav[data-test-nav-list] a[href$=tenant-settings]';
const readingRoomPaneCss = 'nav[data-test-nav-list] a[href$=reading-room]';

const readingRoomName = 'Autotest_Room';
const recordLoadRetries = 10;
const recordLoadWait = 15000;

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
          const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

          cy.expect(
            MultiColumnListRow({ rowIndexInParent: rowNumber })
              .find(Checkbox({ ariaLabel: 'Public' }))
              .is({ disabled: true }),
          );
        }),
    );
  },
};
