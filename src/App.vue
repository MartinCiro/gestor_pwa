<script setup lang="ts">
import { useAuth } from '@composables/useAuth';
import LoginView from '@components/LoginView.vue';
import CasosManager from '@components/CasosManager.vue';

const { isAuthenticated } = useAuth();
</script>

<template>
  <LoginView v-if="!isAuthenticated" />
  <CasosManager v-else />
</template>