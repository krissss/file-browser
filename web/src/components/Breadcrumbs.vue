<script setup lang="ts">
/**
 * 面包屑导航组件
 *
 * 显示当前路径的层级导航
 */
import { computed } from 'vue';

const props = defineProps<{
  path: string;
}>();

const emit = defineEmits<{
  navigate: [path: string];
}>();

const crumbs = computed(() => {
  const parts = props.path.split('/').filter(Boolean);
  const result = [{ label: '根目录', path: '/' }];
  let acc = '';
  for (const part of parts) {
    acc += '/' + part;
    result.push({ label: part, path: acc });
  }
  return result;
});
</script>

<template>
  <div class="breadcrumbs">
    <template v-for="(crumb, index) in crumbs" :key="crumb.path">
      <span class="crumb" @click="emit('navigate', crumb.path)">{{ crumb.label }}</span>
      <span v-if="index < crumbs.length - 1" class="separator">/</span>
    </template>
  </div>
</template>

<style scoped>
.crumb {
  cursor: pointer;
}
.crumb:hover {
  text-decoration: underline;
}
.separator {
  margin: 0 4px;
  color: var(--text-muted);
}
</style>
