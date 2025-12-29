<script lang="ts">
  import Button from "@/components/ui/button/button.svelte";

  let count: number = 0
  const increment = () => {
    count += 1
  }
</script>

<Button onclick={increment}>
  count is {count}
</Button>
