<?php

namespace App\Http\Requests;

use App\Models\Application;
use App\Models\SystemSetting;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateApplicationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        /** @var Application|null $application */
        $application = $this->route('application');

        if (! $user || ! $application) {
            return false;
        }

        return $user->canAccessApplication($application->id);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        if (! $this->user()?->isSuperAdmin()) {
            return [
                'chat_settings' => ['required', 'array'],
                'chat_settings.canned_responses' => ['present', 'array'],
                'chat_settings.canned_responses.*.id' => ['nullable', 'string', 'max:100'],
                'chat_settings.canned_responses.*.shortcut' => ['required', 'string', 'max:100'],
                'chat_settings.canned_responses.*.content' => ['required', 'string', 'max:10000'],
                'chat_settings.canned_responses.*.scope' => ['nullable', 'in:shared,private'],
                'chat_settings.canned_responses.*.created_by' => ['nullable', 'string', 'max:100'],
                'chat_settings.canned_responses.*.updated_at' => ['nullable', 'string', 'max:100'],
            ];
        }

        /** @var Application $application */
        $application = $this->route('application');

        return [
            'app_id' => [
                'required',
                'string',
                'max:50',
                'alpha_dash:ascii',
                Rule::unique('applications', 'app_id')->ignore($application->id),
            ],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            'welcome_message' => ['nullable', 'string', 'max:5000'],
            'chat_settings' => ['nullable', 'array'],
            'system_prompt' => ['required', 'string', 'max:20000'],
            'model' => ['nullable', 'string', 'max:100'],
            'temperature' => ['nullable', 'numeric', 'between:0,2'],
            'max_tokens' => ['nullable', 'integer', 'between:64,8192'],
            'is_active' => ['boolean'],
        ];
    }

    /**
     * Prepare inputs for validation.
     */
    protected function prepareForValidation(): void
    {
        if (! $this->user()?->isSuperAdmin()) {
            return;
        }

        /** @var Application|null $application */
        $application = $this->route('application');

        $this->merge([
            'model' => $this->input('model') ?: ($application?->model ?? (SystemSetting::get('ai_model') ?: config('ai.model', 'openai/gpt-oss-120b'))),
            'temperature' => (float) ($this->input('temperature') ?? ($application?->temperature ?? 0.70)),
            'max_tokens' => (int) ($this->input('max_tokens') ?? ($application?->max_tokens ?? 2048)),
            'is_active' => $this->boolean('is_active', true),
        ]);
    }
}
