<SelectPrimitive.Group data-slot="select-group" {...restProps} />

<script lang="ts">
import {Select as SelectPrimitive} from 'bits-ui'

let {ref = $bindable(null), ...restProps}: SelectPrimitive.GroupProps = $props()
</script>
