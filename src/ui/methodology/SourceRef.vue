<script setup lang="ts">
import { computed } from 'vue'
import { sourceById } from '../../methodology/sources'

/** Référence placée auprès d'une règle ; le détail complet figure dans le tableau des sources. */
const props = defineProps<{ id: string }>()
const source = computed(() => sourceById(props.id))
</script>

<template>
  <span class="cite">(<a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.short }}</a><template v-if="source.secondary">, source secondaire</template>)</span>
</template>
