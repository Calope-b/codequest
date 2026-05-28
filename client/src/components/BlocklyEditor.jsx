import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly'
import { toolbox } from '../blockly/toolbox'

// Importing these files for their side effects registers the custom
// blocks with Blockly before we inject the workspace.
import '../blockly/blocks/movement'
import '../blockly/blocks/sensors'
import '../blockly/generators/movement'
import '../blockly/generators/sensors'

// Mounts a Blockly workspace into a fixed-size container.
//
// onWorkspaceReady is called with the workspace instance once it's
// injected, so the parent can read it later (e.g. to generate code
// from the assembled blocks in sprint 3.6).
function BlocklyEditor({ onWorkspaceReady }) {
  const blocklyDivRef = useRef(null)
  const workspaceRef = useRef(null)

  useEffect(() => {
    // Inject Blockly into our div. trashcan + zoom controls make the
    // editor comfortable to use during testing.
    workspaceRef.current = Blockly.inject(blocklyDivRef.current, {
      toolbox,
      trashcan: true,
      zoom: { controls: true, wheel: true, startScale: 1.0 },
      grid: { spacing: 20, length: 3, colour: '#2a3147', snap: true },
    })

    onWorkspaceReady?.(workspaceRef.current)

    // Dispose the workspace on unmount to avoid leaking DOM/listeners
    // when navigating away (and on React StrictMode's double-mount).
    return () => {
      workspaceRef.current?.dispose()
      workspaceRef.current = null
    }
  }, [])

  // Blockly requires the container to have explicit dimensions before
  // injection, otherwise it renders at 0x0.
  return (
    <div
      ref={blocklyDivRef}
      style={{ width: 480, height: 480, border: '1px solid #2a3147' }}
    />
  )
}

export default BlocklyEditor