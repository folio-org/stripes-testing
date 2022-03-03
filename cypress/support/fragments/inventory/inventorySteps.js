import holdingsRecordView from './holdingsRecordView';
import InventoryInstance from './inventoryInstance';
import QuickMarcEditor from '../quickMarcEditor';

export default {

  addMarcHoldingRecord:() => {
    InventoryInstance.goToMarcHoldingRecordAdding();
    QuickMarcEditor.waitLoading();
    const quickmarcEditor = new QuickMarcEditor(InventoryInstance.validOCLC);
    quickmarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
    QuickMarcEditor.pressSaveAndClose();
    // TODO: see issues in cypress tests run related with this step and awaiting of holdingsRecordView
    //interactorsTools.closeCalloutMessage();
    holdingsRecordView.waitLoading();
  },
};
