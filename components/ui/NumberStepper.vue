<template>
  <div class="num-stepper" :class="{ 'num-stepper--disabled': disabled }">
    <button
      type="button" class="num-stepper-btn" tabindex="-1"
      :disabled="disabled || modelValue <= min"
      @click="step(-1)"
    >−</button>
    <input
      type="text" inputmode="numeric" class="num-stepper-input"
      :value="modelValue" :disabled="disabled" :title="title"
      @input="onInput" @blur="onBlur" @keydown="onKeydown"
    />
    <button
      type="button" class="num-stepper-btn" tabindex="-1"
      :disabled="disabled || modelValue >= max"
      @click="step(1)"
    >+</button>
  </div>
</template>

<script setup>
// Compact −/+ number stepper. Replaces native <input type=number> spinners
// (whose tiny arrows are fiddly) while keeping quick increment and free typing.
const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min:  { type: Number, default: 0 },
  max:  { type: Number, default: Infinity },
  step: { type: Number, default: 1 },
  disabled: { type: Boolean, default: false },
  title: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'change'])

const clamp = (n) => Math.min(props.max, Math.max(props.min, n))

function commit(n) {
  const v = clamp(n)
  emit('update:modelValue', v)
  emit('change', v)
}

function step(dir) {
  if (props.disabled) return
  commit((Number(props.modelValue) || 0) + dir * props.step)
}

function onInput(e) {
  const raw = e.target.value.replace(/[^\d-]/g, '')
  if (raw === '' || raw === '-') return           // let the user clear/type
  const n = parseInt(raw, 10)
  if (!Number.isNaN(n)) emit('update:modelValue', n) // no clamp mid-typing
}

function onBlur(e) {
  const n = parseInt(e.target.value, 10)
  commit(Number.isNaN(n) ? props.min : n)          // clamp on blur
}

function onKeydown(e) {
  if (e.key === 'ArrowUp')   { e.preventDefault(); step(1) }
  if (e.key === 'ArrowDown') { e.preventDefault(); step(-1) }
}
</script>

<style scoped>
.num-stepper {
  display: inline-flex; align-items: stretch;
  border: 1.5px solid var(--border); border-radius: 7px;
  background: var(--surface); overflow: hidden; height: 30px;
}
.num-stepper:focus-within { border-color: var(--accent); }
.num-stepper--disabled { opacity: .5; }

.num-stepper-btn {
  width: 26px; border: none; background: transparent; cursor: pointer;
  color: var(--muted); font-size: 1rem; font-weight: 600; line-height: 1;
  font-family: inherit; display: flex; align-items: center; justify-content: center;
  transition: background .12s, color .12s; user-select: none;
}
.num-stepper-btn:hover:not(:disabled) { background: rgba(32,167,137,.1); color: var(--accent); }
.num-stepper-btn:disabled { opacity: .35; cursor: default; }

.num-stepper-input {
  width: 34px; border: none; background: transparent; text-align: center;
  color: var(--text); font-size: .8rem; font-family: inherit; padding: 0;
  border-left: 1px solid var(--border); border-right: 1px solid var(--border);
}
.num-stepper-input:focus { outline: none; }
.num-stepper-input:disabled { color: var(--muted); }
/* Kill any native spinner just in case */
.num-stepper-input::-webkit-outer-spin-button,
.num-stepper-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>
