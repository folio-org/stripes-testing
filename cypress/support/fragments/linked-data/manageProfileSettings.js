
const manageProfileSettingsPage = "//div[@data-testid='manage-profile-settings']";
const profilesSection = "//div[@data-testid='profiles-list']";
const editorSection = "//div[@data-testid='profile-settings-editor']";

const saveAndCloseButton = "//button[@data-testid='save-and-close']";
const saveAndKeepEditingButton = "//button[@data-testid='save-and-keep-editing']";
const closeButton = "//button[@data-testid='nav-close-button']";

const preferredProfileCheckbox = "//input[@data-testid='type-default-setting']";
const defaultProfileSettingsRadio = "//input[@data-testid='settings-active-default']";
const customProfileSettingsRadio = "//input[@data-testid='settings-active-custom']";

const selectedList = "//div[@data-testid='selected-component-list']";
const unusedList = "//div[@data-testid='unused-component-list']";
const profileComponent = "div.component";
const draggingComponent = "//div[contains(@class, 'component') and contains(@class, 'dragging')]"
const componentActivateMenu = "//button[@data-testid='activate-menu']";
const componentMoveAction = "//button[@data-testid='move-action']";
const componentNudgeUp = "//button[@data-testid='nudge-up']";
const componentNudgeDown = "//button[@data-testid='nudge-down']";

const modalUnsaved = "//div[@data-testid='modal-close-profile-settings']";
const modalUnused = "//div[@data-testid='modal-save-unused-profile-components']";
const modalCloseButton = ".//button[@class='close-button']";
const modalCancelButton = ".//button[@data-testid='modal-button-cancel']";
const modalSubmitButton = ".//button[@data-testid='modal-button-submit']";
const loaderOverlay = "div.loader-overlay";

const component = (id, selector, sub) => {
  return `${sub ? '.' : ''}//div[@data-testid='component-${id}']${selector}`;
};

const center = (el) => {
  const r = el.getBoundingClientRect();
  return { x: Math.floor(r.left + r.width / 2), y: Math.floor(r.top + r.height / 2) };
};

const dragDrop = (dragTarget, dragTargetList, dropTarget, dropTargetList) => {
  cy.xpath(dragTargetList)
    .xpath(component(dragTarget, '', true)).then(($drag) => {
      cy.xpath(dropTargetList)
        .xpath(component(dropTarget, '', true)).then(($drop) => {
          const end = center($drop[0]);

          // The dnd-kit DragOverlay makes things work more smoothly, but in
          // this context it adds an extra burden of replacing the original
          // object with the drag overlay, which may have a markedly different
          // position compared to the original object. We need to calculate
          // the difference between them in order to move back to the start,
          // before finally moving to the target object.
          cy.wrap($drag)
            .realMouseMove(0, 0, { position: 'center', steps: 6 })
            .realMouseDown({ button: 'left' })
            .realMouseMove(0, 1, { position: 'center', steps: 2 })
            .then(($el) => {
              const doc = $el[0].ownerDocument;
              const overlay = doc.querySelector('.drag-overlay')
              const ov = center(overlay);

              const dx = end.x - ov.x;
              const dy = end.y - ov.y;

              return { dx, dy };
            }).then(({ dx, dy }) => {
              cy.wrap($drag)
                .realMouseMove(dx, dy, { position: 'center', steps: 14 })
                .wait(200)
                .realMouseUp({ button: 'left' });
            });
        });
    });
};

export default {
  waitMainLoading: () => {
    cy.xpath(manageProfileSettingsPage).should('be.visible');
    cy.xpath(saveAndCloseButton).should('be.disabled');
    cy.xpath(saveAndKeepEditingButton).should('be.disabled');
  },

  waitProfilesLoading: () => {
    cy.xpath(profilesSection).should('be.visible');
  },

  waitEditorLoading: () => {
    cy.xpath(editorSection).should('be.visible');
    cy.get(loaderOverlay).should('not.exist');
  },

  clickCloseButton: () => {
    cy.xpath(closeButton).should('be.visible');
    cy.do(cy.xpath(closeButton).click());
  },

  clickCloseButtonNoChanges: () => {
    cy.xpath(closeButton).should('be.visible');
    cy.do(cy.xpath(closeButton).click());
    cy.xpath(manageProfileSettingsPage).should('not.exist');
  },

  saveAndClose: () => {
    cy.xpath(saveAndCloseButton).should('be.visible').and('be.enabled');
    cy.do(cy.xpath(saveAndCloseButton).click());
  },

  saveAndKeepEditing: () => {
    cy.xpath(saveAndKeepEditingButton).should('be.visible').and('be.enabled');
    cy.do(cy.xpath(saveAndKeepEditingButton).click());
  },

  togglePreferredProfile: () => {
    cy.xpath(preferredProfileCheckbox).should('be.visible');
    cy.do(cy.xpath(preferredProfileCheckbox).click());
  },

  verifyPreferredProfile: (enabled) => {
    if (enabled) {
      cy.xpath(preferredProfileCheckbox).should('be.checked');
    } else {
      cy.xpath(preferredProfileCheckbox).should('not.be.checked');
    }
  },

  selectDefaultSettings: () => {
    cy.xpath(defaultProfileSettingsRadio).should('be.visible');
    cy.do(cy.xpath(defaultProfileSettingsRadio).click());
  },

  selectCustomSettings: () => {
    cy.xpath(customProfileSettingsRadio).should('be.visible');
    cy.do(cy.xpath(customProfileSettingsRadio).click());
  },

  verifyDefaultSettingsSelected: () => {
    cy.xpath(defaultProfileSettingsRadio).should('be.checked');
  },

  verifyCustomSettingsSelected: () => {
    cy.xpath(customProfileSettingsRadio).should('be.checked');
  },

  selectProfile: (name) => {
    cy.do(
      cy.contains('button', name)
        .scrollIntoView()
        .should('be.visible')
        .click(),
    );
  },

  moveComponentToOppositeListButton: (id) => {
    cy.do(
      cy.xpath(component(id, componentActivateMenu))
        .should('be.visible')
        .click(),
      cy.xpath(component(id, componentMoveAction))
        .should('be.visible')
        .click(),
    );
  },

  nudgeComponentUpButton: (id) => {
    cy.do(
      cy.xpath(component(id, componentNudgeUp))
        .should('be.visible')
        .click(),
    );
  },

  nudgeComponentDownButton: (id) => {
    cy.do(
      cy.xpath(component(id, componentNudgeDown))
        .should('be.visible')
        .click(),
    );
  },

  verifySelectedComponentPosition: (id, position) => {
    cy.xpath(selectedList).get(profileComponent).eq(position-1)
      .invoke('attr', 'data-testid').should('eq', `component-${id}`);
    if (position === 1) {
      cy.xpath(component(id, componentNudgeUp))
        .should('not.exist');
    }
    cy.xpath(selectedList).get(profileComponent).its('length').then((length) => {
      if (position === length) {
        cy.xpath(component(id, componentNudgeDown))
          .should('not.exist');
      }
    });
  },

  verifyUnusedComponentPosition: (id, position) => {
    cy.xpath(unusedList).get(profileComponent).eq(position-1)
      .invoke('attr', 'data-testid').should('eq', `component-${id}`);
  },

  dragUnusedComponentAndCancel: (position) => {
    cy.do(
      cy.xpath(unusedList)
        .get(profileComponent)
        .eq(position-1)
        .realMouseDown({ button: 'left', position: 'center' })
        .realMouseMove(0, 10, { position: 'center' })
        .wait(200),
      cy.realPress('{esc}'),
    );
  },

  dragSelectedComponentAndCancel: (position) => {
    cy.do(
      cy.xpath(selectedList)
        .get(profileComponent)
        .eq(position-1)
        .realMouseDown({ button: 'left', position: 'center' })
        .realMouseMove(0, 10, { position: 'center' })
        .wait(200),
      cy.realPress('{esc}'),
    );
  },

  dragReorderSelectedComponent: (id, targetId) => {
    dragDrop(id, selectedList, targetId, selectedList);
  },

  // test
  dragReorderUnusedComponent: (id, targetId) => {
    dragDrop(id, unusedList, targetId, unusedList);
  },

  // test
  dragSelectedToUnused: (id, targetId) => {
    dragDrop(id, selectedList, targetId, unusedList);
  },

  // test
  dragSelectedToUnusedContainer: (id) => {
    // div.unused-container
  },

  // test
  dragUnusedToSelected: (id, targetId) => {
    dragDrop(id, unusedList, targetId, selectedList);
  },

  // test
  dragComponentToUndroppableRegion: (id) => {
    
  },

  // test
  keyboardReorderUnusedComponent: () => {

  },

  // test
  keyboardDragUnusedComponentAndCancel: (position) => {
    // TODO
    // focus on element somehow?
    cy.do(
      cy.xpath(unusedList)
        .get(profileComponent)
        .eq(position-1)
        .realMouseDown({ button: 'left', position: 'center' })
        .realMouseMove(0, 10, { position: 'center' })
        .wait(200),
      cy.realPress(' '),
      cy.realPress('{downarrow}'),
      cy.realPress('{downarrow}'),
      cy.realPress('{esc}'),
    );
  },

  // test
  keyboardDragSelectedComponentAndCancel: (position) => {
    // TODO
    // focus on element somehow?
    cy.do(
      cy.xpath(selectedList)
        .get(profileComponent)
        .eq(position-1)
        .realMouseDown({ button: 'left', position: 'center' })
        .realMouseMove(0, 10, { position: 'center' })
        .wait(200),
      cy.realPress(' '),
      cy.realPress('{downarrow}'),
      cy.realPress('{downarrow}'),
      cy.realPress('{esc}'),
    );
  },

  verifyModalUnsavedOpen: () => {
    cy.xpath(modalUnsaved).should('be.visible');
  },

  modalUnsavedClose: () => {
    cy.xpath(modalUnsaved)
      .xpath(modalCloseButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnsaved).should('not.exist');
  },

  modalUnsavedContinueWithoutSaving: () => {
    cy.xpath(modalUnsaved)
      .xpath(modalCancelButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnsaved).should('not.exist');
  },

  modalUnsavedContinueWithSaving: () => {
    cy.xpath(modalUnsaved)
      .xpath(modalSubmitButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnsaved).should('not.exist');
  },

  verifyModalUnusedOpen: () => {
    cy.xpath(modalUnused).should('be.visible');
  },

  modalUnusedClose: () => {
    cy.xpath(modalUnused)
      .xpath(modalCloseButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnused).should('not.exist')
  },

  modalUnusedCancel: () => {
    cy.xpath(modalUnused)
      .xpath(modalCancelButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnused).should('not.exist')
  },

  // test more thoroughly - leave and come back
  modalUnusedSave: () => {
    cy.xpath(modalUnused)
      .xpath(modalSubmitButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnused).should('not.exist')
  },
};